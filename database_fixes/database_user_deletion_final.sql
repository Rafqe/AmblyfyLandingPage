-- Final User Deletion Function - Handles Missing Tables
-- This version checks if tables exist before trying to delete from them

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
    tables_processed TEXT[] := '{}';
    tables_deleted TEXT[] := '{}';
    tables_skipped TEXT[] := '{}';
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
        -- Delete from tables that exist, skip those that don't
        
        -- Step 1: rate_limits table (if exists)
        step_info := 'Checking rate_limits table';
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'rate_limits'
        ) THEN
            BEGIN
                DELETE FROM rate_limits WHERE user_id = current_user_id;
                tables_processed := array_append(tables_processed, 'rate_limits');
                tables_deleted := array_append(tables_deleted, 'rate_limits');
            EXCEPTION
                WHEN OTHERS THEN 
                    tables_skipped := array_append(tables_skipped, 'rate_limits (error)');
            END;
        ELSE
            tables_skipped := array_append(tables_skipped, 'rate_limits (not exists)');
        END IF;
        
        -- Step 2: audit_log table (if exists)
        step_info := 'Checking audit_log table';
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'audit_log'
        ) THEN
            BEGIN
                DELETE FROM audit_log WHERE user_id = current_user_id;
                tables_processed := array_append(tables_processed, 'audit_log');
                tables_deleted := array_append(tables_deleted, 'audit_log');
            EXCEPTION
                WHEN OTHERS THEN 
                    tables_skipped := array_append(tables_skipped, 'audit_log (error)');
            END;
        ELSE
            tables_skipped := array_append(tables_skipped, 'audit_log (not exists)');
        END IF;
        
        -- Step 3: daily_logs table (should exist)
        step_info := 'Deleting from daily_logs';
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'daily_logs'
        ) THEN
            DELETE FROM daily_logs WHERE user_id = current_user_id;
            tables_processed := array_append(tables_processed, 'daily_logs');
            tables_deleted := array_append(tables_deleted, 'daily_logs');
        ELSE
            tables_skipped := array_append(tables_skipped, 'daily_logs (not exists)');
        END IF;
        
        -- Step 4: user_goals table (if exists) - this was the problem
        step_info := 'Checking user_goals table';
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_goals'
        ) THEN
            BEGIN
                DELETE FROM user_goals WHERE user_id = current_user_id;
                tables_processed := array_append(tables_processed, 'user_goals');
                tables_deleted := array_append(tables_deleted, 'user_goals');
            EXCEPTION
                WHEN OTHERS THEN 
                    tables_skipped := array_append(tables_skipped, 'user_goals (error: ' || SQLERRM || ')');
            END;
        ELSE
            tables_skipped := array_append(tables_skipped, 'user_goals (not exists)');
        END IF;
        
        -- Step 5: user_data table (should exist)
        step_info := 'Deleting from user_data';
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'user_data'
        ) THEN
            DELETE FROM user_data WHERE user_id = current_user_id;
            tables_processed := array_append(tables_processed, 'user_data');
            tables_deleted := array_append(tables_deleted, 'user_data');
        ELSE
            tables_skipped := array_append(tables_skipped, 'user_data (not exists)');
        END IF;
        
        -- Step 6: Try to delete auth user
        step_info := 'Attempting auth user deletion';
        BEGIN
            DELETE FROM auth.users WHERE id = current_user_id;
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            SELECT json_build_object(
                'success', true,
                'message', 'User account deletion completed',
                'user_id', current_user_id,
                'auth_deleted', true,
                'tables_deleted', tables_deleted,
                'tables_skipped', tables_skipped,
                'tables_processed', tables_processed
            ) INTO result;
            
        EXCEPTION
            WHEN insufficient_privilege THEN
                SELECT json_build_object(
                    'success', true,
                    'message', 'User data deleted successfully. Auth user remains (contact support to complete).',
                    'user_id', current_user_id,
                    'auth_deleted', false,
                    'auth_error', 'insufficient_privilege',
                    'tables_deleted', tables_deleted,
                    'tables_skipped', tables_skipped,
                    'note', 'Data deletion completed but auth record requires admin deletion'
                ) INTO result;
                
            WHEN OTHERS THEN
                SELECT json_build_object(
                    'success', true,
                    'message', 'User data deleted successfully. Auth deletion failed.',
                    'user_id', current_user_id,
                    'auth_deleted', false,
                    'auth_error', SQLERRM,
                    'tables_deleted', tables_deleted,
                    'tables_skipped', tables_skipped
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
                'tables_processed', tables_processed,
                'tables_deleted', tables_deleted,
                'tables_skipped', tables_skipped
            ) INTO result;
            
            RETURN result;
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely() TO authenticated;

-- Also create the missing user_goals table if you want to use goals functionality
CREATE TABLE IF NOT EXISTS user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_goal_minutes INTEGER NOT NULL DEFAULT 240, -- 4 hours
    weekly_goal_minutes INTEGER NOT NULL DEFAULT 1680, -- 28 hours
    set_by_doctor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on user_goals
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_goals
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own goals" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own goals" ON user_goals
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS user_goals_user_id_idx ON user_goals(user_id); 