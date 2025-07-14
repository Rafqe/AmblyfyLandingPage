-- Complete User Deletion Function
-- This function deletes all user data AND the auth record completely

-- Create a function that can delete auth users (requires admin privileges)
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    result JSON;
BEGIN
    -- Get the current user ID
    current_user_id := (SELECT auth.uid());
    
    -- If no target_user_id provided, use current user
    IF target_user_id IS NULL THEN
        target_user_id := current_user_id;
    END IF;
    
    -- Security check: only allow users to delete their own account
    -- (unless they're admin - you can add admin logic here later)
    IF target_user_id != current_user_id THEN
        SELECT json_build_object(
            'success', false,
            'message', 'You can only delete your own account',
            'error', 'unauthorized'
        ) INTO result;
        RETURN result;
    END IF;
    
    -- Validate that the user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        SELECT json_build_object(
            'success', false,
            'message', 'User not found',
            'error', 'user_not_found'
        ) INTO result;
        RETURN result;
    END IF;
    
    BEGIN
        -- Step 1: Delete all custom table data (in correct order to avoid FK violations)
        
        -- Delete daily logs
        DELETE FROM daily_logs WHERE user_id = target_user_id;
        
        -- Delete user goals
        DELETE FROM user_goals WHERE user_id = target_user_id;
        
        -- Delete rate limits (if exists)
        DELETE FROM rate_limits WHERE user_id = target_user_id;
        
        -- Delete audit logs (if exists)
        DELETE FROM audit_log WHERE user_id = target_user_id;
        
        -- Delete user data
        DELETE FROM user_data WHERE user_id = target_user_id;
        
        -- Step 2: Delete the auth user (this requires admin privileges)
        -- This is the critical part that actually removes the auth record
        DELETE FROM auth.users WHERE id = target_user_id;
        
        -- Success response
        SELECT json_build_object(
            'success', true,
            'message', 'User account completely deleted',
            'user_id', target_user_id
        ) INTO result;
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Error response
            SELECT json_build_object(
                'success', false,
                'message', 'Failed to delete user account',
                'error', SQLERRM,
                'error_code', SQLSTATE
            ) INTO result;
            
            RETURN result;
    END;
END;
$$;

-- Grant execute permission to authenticated users (they can only delete themselves)
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;

-- Create an overloaded version that doesn't require parameters (deletes current user)
CREATE OR REPLACE FUNCTION delete_user_completely()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Call the main function with current user ID
    RETURN delete_user_completely((SELECT auth.uid()));
END;
$$;

-- Grant execute permission for the parameterless version
GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated;

-- Test the function (commented out for safety)
-- SELECT delete_user_completely() as deletion_result; 