-- User Deletion Function with Explicit Schema References
-- This version explicitly uses public.table_name to avoid schema visibility issues

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
    goals_before INTEGER := 0;
    goals_after INTEGER := 0;
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
        -- Delete from tables using explicit schema references
        
        -- Step 1: Delete rate_limits (if exists)
        step_info := 'Deleting rate limits';
        BEGIN
            DELETE FROM public.rate_limits WHERE user_id = current_user_id;
        EXCEPTION
            WHEN undefined_table THEN NULL;
            WHEN OTHERS THEN NULL; -- Continue on error
        END;
        
        -- Step 2: Delete audit_log (if exists)
        step_info := 'Deleting audit logs';
        BEGIN
            DELETE FROM public.audit_log WHERE user_id = current_user_id;
        EXCEPTION
            WHEN undefined_table THEN NULL;
            WHEN OTHERS THEN NULL; -- Continue on error
        END;
        
        -- Step 3: Delete daily_logs
        step_info := 'Deleting daily logs';
        DELETE FROM public.daily_logs WHERE user_id = current_user_id;
        
        -- Step 4: Delete user_goals with explicit schema and detailed error handling
        step_info := 'Deleting user goals';
        BEGIN
            -- Count goals before deletion
            SELECT COUNT(*) INTO goals_before FROM public.user_goals WHERE user_id = current_user_id;
            
            -- Perform deletion with explicit schema
            DELETE FROM public.user_goals WHERE user_id = current_user_id;
            
            -- Count goals after deletion
            SELECT COUNT(*) INTO goals_after FROM public.user_goals WHERE user_id = current_user_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- If user_goals deletion fails, provide detailed error but continue
                SELECT json_build_object(
                    'success', false,
                    'message', 'Failed to delete from public.user_goals: ' || SQLERRM,
                    'error', SQLSTATE,
                    'step', step_info,
                    'user_id', current_user_id,
                    'goals_before', goals_before,
                    'search_path', current_setting('search_path')
                ) INTO result;
                RETURN result;
        END;
        
        -- Step 5: Delete user_data
        step_info := 'Deleting user data';
        DELETE FROM public.user_data WHERE user_id = current_user_id;
        
        -- Step 6: Try to delete auth user
        step_info := 'Attempting auth user deletion';
        BEGIN
            DELETE FROM auth.users WHERE id = current_user_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            SELECT json_build_object(
                'success', true,
                'message', 'User account completely deleted',
                'user_id', current_user_id,
                'auth_deleted', true,
                'goals_before', goals_before,
                'goals_after', goals_after,
                'goals_deleted', goals_before - goals_after
            ) INTO result;
            
        EXCEPTION
            WHEN insufficient_privilege THEN
                SELECT json_build_object(
                    'success', true,
                    'message', 'User data deleted successfully. Auth user remains (contact support to complete).',
                    'user_id', current_user_id,
                    'auth_deleted', false,
                    'auth_error', 'insufficient_privilege',
                    'goals_before', goals_before,
                    'goals_after', goals_after,
                    'goals_deleted', goals_before - goals_after,
                    'note', 'Data deletion completed but auth record requires admin deletion'
                ) INTO result;
                
            WHEN OTHERS THEN
                SELECT json_build_object(
                    'success', true,
                    'message', 'User data deleted successfully. Auth deletion failed.',
                    'user_id', current_user_id,
                    'auth_deleted', false,
                    'auth_error', SQLERRM,
                    'goals_before', goals_before,
                    'goals_after', goals_after,
                    'goals_deleted', goals_before - goals_after
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
                'user_id', current_user_id,
                'search_path', current_setting('search_path')
            ) INTO result;
            
            RETURN result;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated; 