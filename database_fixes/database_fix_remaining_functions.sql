-- Fix search_path security for the remaining flagged functions
-- Run this to fix the specific functions still showing security warnings

-- 1. Fix delete_user_completely function
CREATE OR REPLACE FUNCTION delete_user_completely(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Delete from user_data table
    DELETE FROM user_data WHERE user_id = user_id_to_delete;
    
    -- Delete from daily_logs table
    DELETE FROM daily_logs WHERE user_id = user_id_to_delete;
    
    -- Delete from user_goals table
    DELETE FROM user_goals WHERE user_id = user_id_to_delete;
    
    -- Delete from rate_limits table (if exists)
    DELETE FROM rate_limits WHERE user_id = user_id_to_delete;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- 2. Fix simple_handle_new_user function
CREATE OR REPLACE FUNCTION simple_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Insert basic user data when new user is created
    INSERT INTO user_data (user_id, email, account_type)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

-- 3. Fix handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Insert user data
    INSERT INTO user_data (user_id, email, account_type)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert default user goals
    INSERT INTO user_goals (user_id, daily_goal_minutes, weekly_goal_minutes)
    VALUES (NEW.id, 240, 1680)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$;

-- 4. Fix upsert_user_profile function
CREATE OR REPLACE FUNCTION upsert_user_profile(
    p_user_id UUID,
    p_email TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_surname TEXT DEFAULT NULL,
    p_account_type TEXT DEFAULT 'user'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Insert or update user profile
    INSERT INTO user_data (user_id, email, name, surname, account_type)
    VALUES (p_user_id, p_email, p_name, p_surname, p_account_type)
    ON CONFLICT (user_id)
    DO UPDATE SET
        email = COALESCE(EXCLUDED.email, user_data.email),
        name = COALESCE(EXCLUDED.name, user_data.name),
        surname = COALESCE(EXCLUDED.surname, user_data.surname),
        account_type = COALESCE(EXCLUDED.account_type, user_data.account_type),
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION simple_handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Note: Some of these functions might not exist in your database or might have different signatures
-- If you get errors for functions that don't exist, that's normal - just ignore those specific errors 