-- Debug User Goals Deletion Issue
-- This function specifically tests user_goals deletion to understand the problem

CREATE OR REPLACE FUNCTION debug_user_goals_deletion()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    current_user_id UUID;
    result JSON;
    goals_count INTEGER;
    daily_logs_count INTEGER;
    user_data_count INTEGER;
    error_details TEXT;
BEGIN
    current_user_id := (SELECT auth.uid());
    
    -- Check if user_goals table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_goals'
    ) THEN
        SELECT json_build_object(
            'success', false,
            'message', 'user_goals table does not exist',
            'error', 'table_not_found'
        ) INTO result;
        RETURN result;
    END IF;
    
    -- Count existing records
    SELECT COUNT(*) INTO goals_count FROM user_goals WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO daily_logs_count FROM daily_logs WHERE user_id = current_user_id;
    SELECT COUNT(*) INTO user_data_count FROM user_data WHERE user_id = current_user_id;
    
    -- Check RLS policies on user_goals
    BEGIN
        -- Try to select from user_goals first
        PERFORM * FROM user_goals WHERE user_id = current_user_id LIMIT 1;
        
        -- If select works, try delete
        DELETE FROM user_goals WHERE user_id = current_user_id;
        
        SELECT json_build_object(
            'success', true,
            'message', 'user_goals deletion successful',
            'goals_deleted', goals_count,
            'daily_logs_count', daily_logs_count,
            'user_data_count', user_data_count,
            'user_id', current_user_id
        ) INTO result;
        
        RETURN result;
        
    EXCEPTION
        WHEN insufficient_privilege THEN
            SELECT json_build_object(
                'success', false,
                'message', 'Insufficient privilege to delete from user_goals',
                'error', 'insufficient_privilege',
                'goals_count', goals_count,
                'user_id', current_user_id
            ) INTO result;
            RETURN result;
            
        WHEN foreign_key_violation THEN
            SELECT json_build_object(
                'success', false,
                'message', 'Foreign key constraint violation on user_goals',
                'error', 'foreign_key_violation',
                'error_detail', SQLERRM,
                'goals_count', goals_count,
                'user_id', current_user_id
            ) INTO result;
            RETURN result;
            
        WHEN OTHERS THEN
            SELECT json_build_object(
                'success', false,
                'message', 'Error deleting from user_goals: ' || SQLERRM,
                'error', SQLSTATE,
                'goals_count', goals_count,
                'user_id', current_user_id
            ) INTO result;
            RETURN result;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_user_goals_deletion() TO authenticated;

-- Also check what foreign key constraints exist on user_goals
CREATE OR REPLACE FUNCTION check_user_goals_constraints()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    result JSON;
    constraints_info JSON;
BEGIN
    -- Get foreign key constraints information
    SELECT json_agg(
        json_build_object(
            'constraint_name', tc.constraint_name,
            'table_name', tc.table_name,
            'column_name', kcu.column_name,
            'foreign_table_name', ccu.table_name,
            'foreign_column_name', ccu.column_name,
            'constraint_type', tc.constraint_type
        )
    ) INTO constraints_info
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name = 'user_goals' OR ccu.table_name = 'user_goals');
    
    SELECT json_build_object(
        'constraints', COALESCE(constraints_info, '[]'::json)
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_goals_constraints() TO authenticated;

-- Test queries (commented out)
-- SELECT debug_user_goals_deletion() as goals_debug;
-- SELECT check_user_goals_constraints() as constraints_info; 