-- Fix search_path security vulnerabilities for all functions
-- This prevents potential search_path attacks by setting an immutable search_path

-- 1. Fix check_email_exists function
CREATE OR REPLACE FUNCTION check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    email_count INTEGER;
BEGIN
    -- Only allow email checking, return true/false without exposing any user data
    SELECT COUNT(*) INTO email_count
    FROM user_data
    WHERE email = LOWER(TRIM(check_email))
    LIMIT 1;
    
    RETURN email_count > 0;
END;
$$;

-- 2. Fix sync_user_email function (if it exists)
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Get email from auth.users and set it in user_data
    SELECT email INTO NEW.email 
    FROM auth.users 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

-- 3. Fix ensure_user_email function (our current trigger function)
CREATE OR REPLACE FUNCTION ensure_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- If email is not provided, get it from auth.users
    IF NEW.email IS NULL THEN
        SELECT email INTO NEW.email 
        FROM auth.users 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Fix update_user_data_updated_at function
CREATE OR REPLACE FUNCTION update_user_data_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 5. Fix update_updated_at_column function (general purpose)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6. Fix safe_update_updated_at function
CREATE OR REPLACE FUNCTION safe_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 7. Fix check_rate_limit function (if it exists)
CREATE OR REPLACE FUNCTION check_rate_limit(
    action_name TEXT,
    max_count INTEGER,
    window_minutes INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
$$;

-- 8. Fix rate_limit_daily_logs function
CREATE OR REPLACE FUNCTION rate_limit_daily_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Limit to 10 log entries per hour
    IF NOT check_rate_limit('daily_log_insert', 10, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many log entries. Please wait before adding more.';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Note: For functions that don't exist in your database, you can ignore the errors
-- The important ones are check_email_exists and the trigger functions you're actually using 