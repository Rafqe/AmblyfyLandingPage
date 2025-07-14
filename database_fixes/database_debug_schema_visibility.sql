-- Debug Schema Visibility Issue
-- This function checks why user_goals table isn't visible to the deletion function

CREATE OR REPLACE FUNCTION debug_table_visibility()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    result JSON;
    search_path_value TEXT;
    current_schema TEXT;
    table_exists_info_schema BOOLEAN;
    table_exists_pg_tables BOOLEAN;
    can_select_user_goals BOOLEAN := false;
    can_delete_user_goals BOOLEAN := false;
    user_goals_count INTEGER := 0;
BEGIN
    current_user_id := (SELECT auth.uid());
    
    -- Get current search_path
    SELECT current_setting('search_path') INTO search_path_value;
    
    -- Get current schema
    SELECT current_schema() INTO current_schema;
    
    -- Check if table exists using information_schema
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_goals'
    ) INTO table_exists_info_schema;
    
    -- Check if table exists using pg_tables
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'user_goals'
    ) INTO table_exists_pg_tables;
    
    -- Test if we can SELECT from user_goals
    BEGIN
        SELECT COUNT(*) INTO user_goals_count FROM public.user_goals WHERE user_id = current_user_id;
        can_select_user_goals := true;
    EXCEPTION
        WHEN OTHERS THEN
            can_select_user_goals := false;
    END;
    
    -- Test if we can DELETE from user_goals (we'll rollback)
    BEGIN
        -- This is in a savepoint so we can rollback
        SAVEPOINT test_delete;
        DELETE FROM public.user_goals WHERE user_id = current_user_id AND false; -- Won't actually delete anything
        can_delete_user_goals := true;
        ROLLBACK TO test_delete;
    EXCEPTION
        WHEN OTHERS THEN
            can_delete_user_goals := false;
            ROLLBACK TO test_delete;
    END;
    
    SELECT json_build_object(
        'current_user_id', current_user_id,
        'search_path', search_path_value,
        'current_schema', current_schema,
        'table_exists_info_schema', table_exists_info_schema,
        'table_exists_pg_tables', table_exists_pg_tables,
        'can_select_user_goals', can_select_user_goals,
        'can_delete_user_goals', can_delete_user_goals,
        'user_goals_count', user_goals_count
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_table_visibility() TO authenticated;

-- Also create a simple test to try direct deletion
CREATE OR REPLACE FUNCTION test_direct_user_goals_deletion()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    result JSON;
    goals_before INTEGER;
    goals_after INTEGER;
BEGIN
    current_user_id := (SELECT auth.uid());
    
    -- Count goals before
    SELECT COUNT(*) INTO goals_before FROM public.user_goals WHERE user_id = current_user_id;
    
    BEGIN
        -- Try the actual DELETE that's failing
        DELETE FROM public.user_goals WHERE user_id = current_user_id;
        
        -- Count goals after
        SELECT COUNT(*) INTO goals_after FROM public.user_goals WHERE user_id = current_user_id;
        
        SELECT json_build_object(
            'success', true,
            'message', 'Direct deletion successful',
            'user_id', current_user_id,
            'goals_before', goals_before,
            'goals_after', goals_after,
            'goals_deleted', goals_before - goals_after
        ) INTO result;
        
        RETURN result;
        
    EXCEPTION
        WHEN OTHERS THEN
            SELECT json_build_object(
                'success', false,
                'message', 'Direct deletion failed: ' || SQLERRM,
                'error', SQLSTATE,
                'user_id', current_user_id,
                'goals_before', goals_before,
                'search_path', current_setting('search_path')
            ) INTO result;
            
            RETURN result;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION test_direct_user_goals_deletion() TO authenticated;

-- Test the current RLS policies on user_goals
CREATE OR REPLACE FUNCTION check_user_goals_policies()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    result JSON;
    policies_info JSON;
BEGIN
    -- Get RLS policies for user_goals
    SELECT json_agg(
        json_build_object(
            'policyname', policyname,
            'permissive', permissive,
            'roles', roles,
            'cmd', cmd,
            'qual', qual,
            'with_check', with_check
        )
    ) INTO policies_info
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_goals';
    
    SELECT json_build_object(
        'table_has_rls', (
            SELECT EXISTS (
                SELECT 1 FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'user_goals' 
                AND rowsecurity = true
            )
        ),
        'policies', COALESCE(policies_info, '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_goals_policies() TO authenticated;

-- Test functions (commented out)
-- SELECT debug_table_visibility() as visibility_debug;
-- SELECT test_direct_user_goals_deletion() as deletion_test;
-- SELECT check_user_goals_policies() as policies_check; 