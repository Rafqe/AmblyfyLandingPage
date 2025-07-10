-- Security Update for Database Schema

-- 1. Remove the unique constraint that prevents multiple entries per day
-- (This should have been done in previous migration but may need re-applying)
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_id_date_key;

-- 2. Add missing DELETE policy for daily_logs
CREATE POLICY "Users can delete own daily logs" ON daily_logs
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Add constraints to prevent abuse
-- Limit time_spent_minutes to reasonable values (1 minute to 24 hours)
ALTER TABLE daily_logs 
ADD CONSTRAINT daily_logs_time_check 
CHECK (time_spent_minutes >= 1 AND time_spent_minutes <= 1440);

-- Limit notes length to prevent DoS attacks
ALTER TABLE daily_logs 
ADD CONSTRAINT daily_logs_notes_length 
CHECK (char_length(notes) <= 1000);

-- Limit goal values to reasonable ranges
ALTER TABLE user_goals
ADD CONSTRAINT user_goals_daily_check
CHECK (daily_goal_minutes >= 30 AND daily_goal_minutes <= 720); -- 30min to 12 hours

ALTER TABLE user_goals
ADD CONSTRAINT user_goals_weekly_check  
CHECK (weekly_goal_minutes >= 210 AND weekly_goal_minutes <= 5040); -- 3.5h to 84 hours

-- 4. Add audit trail for sensitive operations
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.uid() IN (
            SELECT user_id FROM user_data WHERE account_type = 'admin'
        )
    );

-- 5. Add function to log sensitive operations
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Add audit triggers for sensitive tables
CREATE TRIGGER audit_user_data_changes
    AFTER INSERT OR UPDATE OR DELETE ON user_data
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_user_goals_changes  
    AFTER INSERT OR UPDATE OR DELETE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 7. Add rate limiting table for database-level protection
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action)
);

-- Enable RLS on rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limits
CREATE POLICY "Users can view own rate limits" ON rate_limits
    FOR SELECT USING (auth.uid() = user_id);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    action_name TEXT,
    max_count INTEGER,
    window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current window start
    window_start := NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Check if rate limit entry exists and is current
    SELECT count INTO current_count
    FROM rate_limits
    WHERE user_id = auth.uid() 
    AND action = action_name
    AND window_start >= window_start;
    
    -- If no entry or expired, create new one
    IF current_count IS NULL THEN
        INSERT INTO rate_limits (user_id, action, count, window_start)
        VALUES (auth.uid(), action_name, 1, NOW())
        ON CONFLICT (user_id, action) 
        DO UPDATE SET count = 1, window_start = NOW();
        RETURN TRUE;
    END IF;
    
    -- If under limit, increment
    IF current_count < max_count THEN
        UPDATE rate_limits 
        SET count = count + 1
        WHERE user_id = auth.uid() AND action = action_name;
        RETURN TRUE;
    END IF;
    
    -- Rate limit exceeded
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add rate limiting to daily_logs insertion
CREATE OR REPLACE FUNCTION rate_limit_daily_logs()
RETURNS TRIGGER AS $$
BEGIN
    -- Limit to 10 log entries per hour
    IF NOT check_rate_limit('daily_log_insert', 10, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many log entries. Please wait before adding more.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rate_limit_daily_logs_trigger
    BEFORE INSERT ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION rate_limit_daily_logs(); 