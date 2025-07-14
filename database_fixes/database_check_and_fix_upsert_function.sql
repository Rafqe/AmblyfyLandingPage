-- Check and fix the upsert_user_profile function specifically
-- Run this to see the current function and fix the search_path issue

-- First, let's see what the current function looks like
SELECT 
    routine_name,
    routine_definition,
    external_language,
    security_type
FROM information_schema.routines 
WHERE routine_name = 'upsert_user_profile'
AND routine_schema = 'public';

-- Also check function arguments
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'upsert_user_profile'
    AND routine_schema = 'public'
)
ORDER BY ordinal_position;

-- Now let's drop and recreate the function with proper search_path
-- (This covers multiple possible signatures)

-- Drop the existing function (all overloads)
DROP FUNCTION IF EXISTS public.upsert_user_profile CASCADE;

-- Recreate with the most common signature and secure search_path
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
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

-- Alternative signature if the above doesn't match
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
    p_user_id UUID,
    p_name TEXT,
    p_surname TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    INSERT INTO user_data (user_id, name, surname)
    VALUES (p_user_id, p_name, p_surname)
    ON CONFLICT (user_id)
    DO UPDATE SET
        name = EXCLUDED.name,
        surname = EXCLUDED.surname,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- Verify the function now has proper search_path
SELECT 
    proname as function_name,
    proconfig as configuration
FROM pg_proc 
WHERE proname = 'upsert_user_profile'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 