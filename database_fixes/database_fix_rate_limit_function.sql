-- Fix the rate limiting function to accept user_id as parameter
-- This solves the issue where auth.uid() returns NULL in SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    action_name TEXT,
    max_count INTEGER,
    window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    window_start_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate user_id parameter
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current window start time
    window_start_time := NOW() - (window_minutes || ' minutes')::INTERVAL;
    
    -- Check if rate limit entry exists and is current
    SELECT count INTO current_count
    FROM rate_limits
    WHERE user_id = p_user_id
    AND action = action_name
    AND rate_limits.window_start >= window_start_time;
    
    -- If no entry or expired, create new one
    IF current_count IS NULL THEN
        INSERT INTO rate_limits (user_id, action, count, window_start)
        VALUES (p_user_id, action_name, 1, NOW())
        ON CONFLICT (user_id, action) 
        DO UPDATE SET count = 1, window_start = NOW();
        RETURN TRUE;
    END IF;
    
    -- If under limit, increment
    IF current_count < max_count THEN
        UPDATE rate_limits 
        SET count = count + 1
        WHERE user_id = p_user_id AND action = action_name;
        RETURN TRUE;
    END IF;
    
    -- Rate limit exceeded
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- Update the trigger function to pass the user_id parameter
CREATE OR REPLACE FUNCTION rate_limit_daily_logs()
RETURNS TRIGGER AS $$
BEGIN
    -- Limit to 10 log entries per hour, pass the user_id from NEW record
    IF NOT check_rate_limit(NEW.user_id, 'daily_log_insert', 10, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many log entries. Please wait before adding more.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog;

-- Test the function with a proper user_id (replace with actual user_id if needed)
-- SELECT check_rate_limit('00000000-0000-0000-0000-000000000000'::UUID, 'test_action', 5, 60) as test_result; 