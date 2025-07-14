-- Fix RLS Performance Issues
-- Replace direct auth.uid() calls with (SELECT auth.uid()) for better performance
-- This prevents re-evaluation of auth functions for each row

-- ============================================================================
-- user_data table policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;
DROP POLICY IF EXISTS "Doctors can view patient data" ON user_data;
DROP POLICY IF EXISTS "Doctors can update patient data" ON user_data;
DROP POLICY IF EXISTS "Users can view own data only" ON user_data;

-- Create optimized policies with subqueries
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Doctors can view their patients' data
CREATE POLICY "Doctors can view patient data" ON user_data
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR 
        (SELECT auth.uid()) = doctor_id
    );

-- Doctors can update their patients' data
CREATE POLICY "Doctors can update patient data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR 
        (SELECT auth.uid()) = doctor_id OR
        -- Allow doctors to assign themselves to patients
        (doctor_id IS NULL AND account_type = 'user')
    );

-- ============================================================================
-- daily_logs table policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can delete own daily logs" ON daily_logs;

-- Create optimized policies with subqueries
CREATE POLICY "Users can view own daily logs" ON daily_logs
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own daily logs" ON daily_logs
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own daily logs" ON daily_logs
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own daily logs" ON daily_logs
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- user_goals table policies
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;
DROP POLICY IF EXISTS "Doctors can view patient goals" ON user_goals;
DROP POLICY IF EXISTS "Doctors can update patient goals" ON user_goals;
DROP POLICY IF EXISTS "Doctors can insert patient goals" ON user_goals;

-- Create optimized policies with subqueries
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own goals" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Doctors can view patient goals" ON user_goals
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        )
    );

CREATE POLICY "Doctors can update patient goals" ON user_goals
    FOR UPDATE 
    TO authenticated
    USING (
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        )
    );

CREATE POLICY "Doctors can insert patient goals" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        ) OR (SELECT auth.uid()) = user_id
    );

-- ============================================================================
-- audit_log table policies (if exists)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_log;

-- Create optimized policy with subquery
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM user_data WHERE account_type = 'admin'
        )
    );

-- ============================================================================
-- rate_limits table policies (if exists)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;

-- Create optimized policy with subquery
CREATE POLICY "Users can view own rate limits" ON rate_limits
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Verification query
-- ============================================================================

-- Verify all policies are created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'audit_log', 'rate_limits')
ORDER BY tablename, policyname; 