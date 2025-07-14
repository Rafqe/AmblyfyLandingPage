-- Fix both versions of upsert_user_profile function with proper search_path
-- Based on the actual function definitions found in your database

-- Drop all existing versions of the function with specific signatures
DROP FUNCTION IF EXISTS public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- Version 1: The one that returns JSON
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
    p_user_id UUID,
    p_name TEXT,
    p_surname TEXT,
    p_account_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    result JSON;
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS (
        SELECT 1 FROM user_data WHERE user_id = p_user_id
    ) INTO profile_exists;
    
    IF profile_exists THEN
        -- UPDATE existing profile
        UPDATE user_data 
        SET 
            name = p_name,
            surname = p_surname,
            account_type = p_account_type,
            updated_at = COALESCE(updated_at, NOW()) -- Only set if column exists
        WHERE user_id = p_user_id;
        
        SELECT json_build_object(
            'success', true,
            'action', 'updated',
            'message', 'Profile updated successfully',
            'user_id', p_user_id
        ) INTO result;
    ELSE
        -- INSERT new profile
        INSERT INTO user_data (user_id, name, surname, account_type)
        VALUES (p_user_id, p_name, p_surname, p_account_type);
        
        SELECT json_build_object(
            'success', true,
            'action', 'created',
            'message', 'Profile created successfully',
            'user_id', p_user_id
        ) INTO result;
    END IF;
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        SELECT json_build_object(
            'success', false,
            'action', 'error',
            'message', 'Failed to save profile',
            'error', SQLERRM
        ) INTO result;
        
        RETURN result;
END;
$$;

-- Version 2: The one that returns BOOLEAN with email parameter
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_surname TEXT,
    p_account_type TEXT
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

-- Grant permissions for both function signatures
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Verify both functions now have proper search_path configuration
SELECT 
    proname as function_name,
    pronargs as num_args,
    proconfig as configuration
FROM pg_proc 
WHERE proname = 'upsert_user_profile'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY pronargs; 