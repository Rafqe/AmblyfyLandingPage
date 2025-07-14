-- Debug Version of Complete User Deletion Function
-- This version provides detailed logging to help identify the issue

-- Drop existing function
DROP FUNCTION IF EXISTS delete_user_completely();

-- Create debug version with detailed error reporting
CREATE OR REPLACE FUNCTION delete_user_completely()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    result JSON;
    step_info TEXT;
    deleted_count INTEGER;
BEGIN
    step_info := 'Getting current user ID';
    -- Get the current user ID
    current_user_id := (SELECT auth.uid());
    
    -- Validate that we have a user ID
    IF current_user_id IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'No authenticated user found',
            'error', 'not_authenticated',
            'step', step_info
        ) INTO result;
        RETURN result;
    END IF;
    
    step_info := 'Checking if user exists';
    -- Validate that the user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = current_user_id) THEN
        SELECT json_build_object(
            'success', false,
            'message', 'User not found in auth.users',
            'error', 'user_not_found',
            'step', step_info,
            'user_id', current_user_id
        ) INTO result;
        RETURN result;
    END IF;
    
    BEGIN
        -- Step 1: Delete daily logs
        step_info := 'Deleting daily logs';
        DELETE FROM daily_logs WHERE user_id = current_user_id;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        -- Step 2: Delete user goals
        step_info := 'Deleting user goals';
        DELETE FROM user_goals WHERE user_id = current_user_id;
        
        -- Step 3: Delete rate limits (if table exists)
        step_info := 'Deleting rate limits';
        BEGIN
            DELETE FROM rate_limits WHERE user_id = current_user_id;
        EXCEPTION
            WHEN undefined_table THEN
                -- Table doesn't exist, skip
                NULL;
        END;
        
        -- Step 4: Delete audit logs (if table exists)
        step_info := 'Deleting audit logs';
        BEGIN
            DELETE FROM audit_log WHERE user_id = current_user_id;
        EXCEPTION
            WHEN undefined_table THEN
                -- Table doesn't exist, skip
                NULL;
        END;
        
        -- Step 5: Delete user data
        step_info := 'Deleting user data';
        DELETE FROM user_data WHERE user_id = current_user_id;
        
        -- Step 6: Try to delete the auth user
        step_info := 'Deleting auth user';
        BEGIN
            DELETE FROM auth.users WHERE id = current_user_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            IF deleted_count = 0 THEN
                SELECT json_build_object(
                    'success', false,
                    'message', 'Auth user was not deleted (no rows affected)',
                    'error', 'auth_delete_failed',
                    'step', step_info,
                    'user_id', current_user_id
                ) INTO result;
                RETURN result;
            END IF;
            
        EXCEPTION
            WHEN insufficient_privilege THEN
                SELECT json_build_object(
                    'success', false,
                    'message', 'Insufficient privileges to delete auth user',
                    'error', 'insufficient_privilege',
                    'step', step_info,
                    'user_id', current_user_id
                ) INTO result;
                RETURN result;
            WHEN OTHERS THEN
                SELECT json_build_object(
                    'success', false,
                    'message', 'Error deleting auth user: ' || SQLERRM,
                    'error', SQLSTATE,
                    'step', step_info,
                    'user_id', current_user_id
                ) INTO result;
                RETURN result;
        END;
        
        -- Success response
        SELECT json_build_object(
            'success', true,
            'message', 'User account completely deleted',
            'user_id', current_user_id,
            'deleted_auth_rows', deleted_count
        ) INTO result;
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Detailed error response
            SELECT json_build_object(
                'success', false,
                'message', 'Failed at step: ' || step_info,
                'error', SQLERRM,
                'error_code', SQLSTATE,
                'step', step_info,
                'user_id', current_user_id
            ) INTO result;
            
            RETURN result;
    END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated;

-- Also create a simple test function to check what user we're working with
CREATE OR REPLACE FUNCTION debug_current_user()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    auth_user_exists BOOLEAN;
    user_data_exists BOOLEAN;
    result JSON;
BEGIN
    current_user_id := (SELECT auth.uid());
    
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = current_user_id) INTO auth_user_exists;
    SELECT EXISTS(SELECT 1 FROM user_data WHERE user_id = current_user_id) INTO user_data_exists;
    
    SELECT json_build_object(
        'current_user_id', current_user_id,
        'auth_user_exists', auth_user_exists,
        'user_data_exists', user_data_exists
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_current_user() TO authenticated;

-- Test the debug function
-- SELECT debug_current_user() as user_info; 