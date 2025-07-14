-- Safe Security Update for Database Schema
-- This script handles existing columns and constraints gracefully

-- 1. Add doctor_id column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_data' AND column_name = 'doctor_id'
    ) THEN
        ALTER TABLE user_data ADD COLUMN doctor_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Remove the unique constraint that prevents multiple entries per day (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_logs_user_id_date_key' 
        AND table_name = 'daily_logs'
    ) THEN
        ALTER TABLE daily_logs DROP CONSTRAINT daily_logs_user_id_date_key;
    END IF;
END $$;

-- 3. Add missing DELETE policy for daily_logs (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can delete own daily logs' 
        AND tablename = 'daily_logs'
    ) THEN
        CREATE POLICY "Users can delete own daily logs" ON daily_logs
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Add constraints to prevent abuse (only if they don't exist)
DO $$
BEGIN
    -- Time constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_logs_time_check' 
        AND table_name = 'daily_logs'
    ) THEN
        ALTER TABLE daily_logs 
        ADD CONSTRAINT daily_logs_time_check 
        CHECK (time_spent_minutes >= 1 AND time_spent_minutes <= 1440);
    END IF;

    -- Notes length constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_logs_notes_length' 
        AND table_name = 'daily_logs'
    ) THEN
        ALTER TABLE daily_logs 
        ADD CONSTRAINT daily_logs_notes_length 
        CHECK (char_length(notes) <= 1000);
    END IF;
END $$;

-- 5. Add goal constraints (only if they don't exist)
DO $$
BEGIN
    -- Daily goal constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_goals_daily_check' 
        AND table_name = 'user_goals'
    ) THEN
        ALTER TABLE user_goals
        ADD CONSTRAINT user_goals_daily_check
        CHECK (daily_goal_minutes >= 30 AND daily_goal_minutes <= 720);
    END IF;

    -- Weekly goal constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_goals_weekly_check' 
        AND table_name = 'user_goals'
    ) THEN
        ALTER TABLE user_goals
        ADD CONSTRAINT user_goals_weekly_check  
        CHECK (weekly_goal_minutes >= 210 AND weekly_goal_minutes <= 5040);
    END IF;
END $$;

-- 6. Create audit_log table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'audit_log' AND rowsecurity = true
    ) THEN
        ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 7. Create audit log policy (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Admins can view audit logs' 
        AND tablename = 'audit_log'
    ) THEN
        CREATE POLICY "Admins can view audit logs" ON audit_log
            FOR SELECT USING (
                auth.jwt() ->> 'role' = 'admin' OR
                auth.uid() IN (
                    SELECT user_id FROM user_data WHERE account_type = 'admin'
                )
            );
    END IF;
END $$;

-- 8. Create audit function (replace if exists)
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

-- 9. Create audit triggers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'audit_user_data_changes'
    ) THEN
        CREATE TRIGGER audit_user_data_changes
            AFTER INSERT OR UPDATE OR DELETE ON user_data
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'audit_user_goals_changes'
    ) THEN
        CREATE TRIGGER audit_user_goals_changes  
            AFTER INSERT OR UPDATE OR DELETE ON user_goals
            FOR EACH ROW EXECUTE FUNCTION log_audit_event();
    END IF;
END $$;

-- 10. Create rate_limits table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action)
);

-- Enable RLS on rate limits (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'rate_limits' AND rowsecurity = true
    ) THEN
        ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 11. Create rate limits policy (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own rate limits' 
        AND tablename = 'rate_limits'
    ) THEN
        CREATE POLICY "Users can view own rate limits" ON rate_limits
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- 12. Create rate limiting function (replace if exists)
CREATE OR REPLACE FUNCTION check_rate_limit(
    action_name TEXT,
    max_count INTEGER,
    window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current window start
    window_start_time := NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Check if rate limit entry exists and is current
    SELECT count INTO current_count
    FROM rate_limits
    WHERE user_id = auth.uid() 
    AND action = action_name
    AND window_start >= window_start_time;
    
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

-- 13. Create rate limiting trigger function (replace if exists)
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

-- 14. Create rate limiting trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'rate_limit_daily_logs_trigger'
    ) THEN
        CREATE TRIGGER rate_limit_daily_logs_trigger
            BEFORE INSERT ON daily_logs
            FOR EACH ROW EXECUTE FUNCTION rate_limit_daily_logs();
    END IF;
END $$;

-- 15. Success message
DO $$
BEGIN
    RAISE NOTICE 'Security update completed successfully! ✅';
    RAISE NOTICE 'Added: audit logging, rate limiting, input validation constraints';
    RAISE NOTICE 'Fixed: removed unique constraint for multiple daily entries';
END $$; 