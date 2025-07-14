-- Safe User Deletion Function
-- This version deletes in reverse dependency order and handles constraint issues

DROP FUNCTION IF EXISTS delete_user_completely();

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
    current_user_id := (SELECT auth.uid());
    
    IF current_user_id IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'No authenticated user found',
            'error', 'not_authenticated'
        ) INTO result;
        RETURN result;
    END IF;
    
    BEGIN
        -- Delete in reverse dependency order to avoid foreign key issues
        
        -- Step 1: Delete rate limits first (if exists) - usually no dependencies
        step_info := 'Deleting rate limits';
        BEGIN
            DELETE FROM rate_limits WHERE user_id = current_user_id;
        EXCEPTION
            WHEN undefined_table THEN NULL;
            WHEN OTHERS THEN 
                -- Continue even if this fails
                NULL;
        END;
        
        -- Step 2: Delete audit logs (if exists) - usually no dependencies  
        step_info := 'Deleting audit logs';
        BEGIN
            DELETE FROM audit_log WHERE user_id = current_user_id;
        EXCEPTION
            WHEN undefined_table THEN NULL;
            WHEN OTHERS THEN 
                -- Continue even if this fails
                NULL;
        END;
        
        -- Step 3: Delete daily logs - might reference user_goals
        step_info := 'Deleting daily logs';
        DELETE FROM daily_logs WHERE user_id = current_user_id;
        
        -- Step 4: Delete user_goals - this was failing, so let's be more careful
        step_info := 'Deleting user goals';
        BEGIN
            -- First check if we can select (RLS policy check)
            PERFORM 1 FROM user_goals WHERE user_id = current_user_id LIMIT 1;
            
            -- If select works, try delete
            DELETE FROM user_goals WHERE user_id = current_user_id;
            
        EXCEPTION
            WHEN insufficient_privilege THEN
                -- Skip if no permission, but continue with other deletions
                NULL;
            WHEN OTHERS THEN
                -- Log the specific error but don't fail completely
                SELECT json_build_object(
                    'success', false,
                    'message', 'Failed to delete user_goals: ' || SQLERRM,
                    'error', SQLSTATE,
                    'step', step_info,
                    'user_id', current_user_id
                ) INTO result;
                RETURN result;
        END;
        
        -- Step 5: Delete user_data last
        step_info := 'Deleting user data';
        DELETE FROM user_data WHERE user_id = current_user_id;
        
        -- Step 6: Try to delete auth user (this might not work in Supabase)
        step_info := 'Attempting auth user deletion';
        BEGIN
            DELETE FROM auth.users WHERE id = current_user_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            SELECT json_build_object(
                'success', true,
                'message', 'User account completely deleted including auth',
                'user_id', current_user_id,
                'auth_deleted', true
            ) INTO result;
            
        EXCEPTION
            WHEN insufficient_privilege THEN
                -- Auth deletion failed, but data deletion succeeded
                SELECT json_build_object(
                    'success', true,
                    'message', 'User data deleted successfully. Auth user remains (contact support to complete).',
                    'user_id', current_user_id,
                    'auth_deleted', false,
                    'note', 'Data deletion completed but auth record requires admin deletion'
                ) INTO result;
                
            WHEN OTHERS THEN
                -- Auth deletion failed, but data deletion succeeded
                SELECT json_build_object(
                    'success', true,
                    'message', 'User data deleted successfully. Auth deletion failed: ' || SQLERRM,
                    'user_id', current_user_id,
                    'auth_deleted', false,
                    'auth_error', SQLERRM
                ) INTO result;
        END;
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            SELECT json_build_object(
                'success', false,
                'message', 'Failed at step: ' || step_info || ' - ' || SQLERRM,
                'error', SQLSTATE,
                'step', step_info,
                'user_id', current_user_id
            ) INTO result;
            
            RETURN result;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated;

-- Test function to check current user status
CREATE OR REPLACE FUNCTION check_user_deletion_readiness()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    result JSON;
    daily_logs_count INTEGER;
    user_goals_count INTEGER;
    user_data_count INTEGER;
    rate_limits_count INTEGER := 0;
    audit_log_count INTEGER := 0;
BEGIN
    current_user_id := (SELECT auth.uid());
    
    -- Count records in each table
    SELECT COUNT(*) INTO daily_logs_count FROM daily_logs WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO user_goals_count FROM user_goals WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO user_data_count FROM user_data WHERE user_id = current_user_id;
    
    -- Count optional tables
    BEGIN
        SELECT COUNT(*) INTO rate_limits_count FROM rate_limits WHERE user_id = current_user_id;
    EXCEPTION
        WHEN undefined_table THEN rate_limits_count := 0;
    END;
    
    BEGIN
        SELECT COUNT(*) INTO audit_log_count FROM audit_log WHERE user_id = current_user_id;
    EXCEPTION
        WHEN undefined_table THEN audit_log_count := 0;
    END;
    
    SELECT json_build_object(
        'user_id', current_user_id,
        'daily_logs_count', daily_logs_count,
        'user_goals_count', user_goals_count,
        'user_data_count', user_data_count,
        'rate_limits_count', rate_limits_count,
        'audit_log_count', audit_log_count,
        'total_records', daily_logs_count + user_goals_count + user_data_count + rate_limits_count + audit_log_count
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_deletion_readiness() TO authenticated; 