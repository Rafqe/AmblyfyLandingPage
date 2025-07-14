-- SAFE RLS Performance Fix
-- This preserves all current working policies and only fixes the performance issue
-- by replacing auth.uid() with (SELECT auth.uid())

-- ============================================================================
-- BEFORE RUNNING: Check what policies currently exist
-- ============================================================================

-- Run this query first to see current policies:
/*
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
*/

-- ============================================================================
-- user_data table - SAFE minimal changes
-- ============================================================================

-- Only replace the policies that have performance issues
-- Keep the exact same logic, just wrap auth.uid() in SELECT

-- Replace: Users can view own data
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can view own data only" ON user_data;
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Replace: Users can insert own data  
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Replace: Users can update own data
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Replace: Users can delete own data (this is the one mentioned in your warning)
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Replace: Doctors can view patient data (preserve exact logic)
DROP POLICY IF EXISTS "Doctors can view patient data" ON user_data;
CREATE POLICY "Doctors can view patient data" ON user_data
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR 
        (SELECT auth.uid()) = doctor_id
    );

-- Replace: Doctors can update patient data (preserve exact logic)
DROP POLICY IF EXISTS "Doctors can update patient data" ON user_data;
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
-- daily_logs table - SAFE minimal changes
-- ============================================================================

-- Replace: Users can view own daily logs
DROP POLICY IF EXISTS "Users can view own daily logs" ON daily_logs;
CREATE POLICY "Users can view own daily logs" ON daily_logs
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Replace: Users can insert own daily logs
DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;
CREATE POLICY "Users can insert own daily logs" ON daily_logs
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Replace: Users can update own daily logs
DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;
CREATE POLICY "Users can update own daily logs" ON daily_logs
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Replace: Users can delete own daily logs
DROP POLICY IF EXISTS "Users can delete own daily logs" ON daily_logs;
CREATE POLICY "Users can delete own daily logs" ON daily_logs
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- user_goals table - SAFE minimal changes
-- ============================================================================

-- Replace: Users can view own goals
DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Replace: Users can insert own goals
DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;
CREATE POLICY "Users can insert own goals" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Replace: Doctors can view patient goals (preserve exact logic)
DROP POLICY IF EXISTS "Doctors can view patient goals" ON user_goals;
CREATE POLICY "Doctors can view patient goals" ON user_goals
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        )
    );

-- Replace: Doctors can update patient goals (preserve exact logic)
DROP POLICY IF EXISTS "Doctors can update patient goals" ON user_goals;
CREATE POLICY "Doctors can update patient goals" ON user_goals
    FOR UPDATE 
    TO authenticated
    USING (
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        )
    );

-- Replace: Doctors can insert patient goals (preserve exact logic)
DROP POLICY IF EXISTS "Doctors can insert patient goals" ON user_goals;
CREATE POLICY "Doctors can insert patient goals" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        ) OR (SELECT auth.uid()) = user_id
    );

-- ============================================================================
-- OPTIONAL: Only fix these if they exist and are causing performance issues
-- ============================================================================

-- Fix audit_log policy only if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Admins can view audit logs' 
        AND tablename = 'audit_log'
    ) THEN
        DROP POLICY "Admins can view audit logs" ON audit_log;
        CREATE POLICY "Admins can view audit logs" ON audit_log
            FOR SELECT 
            TO authenticated
            USING (
                (SELECT auth.uid()) IN (
                    SELECT user_id FROM user_data WHERE account_type = 'admin'
                )
            );
    END IF;
END $$;

-- Fix rate_limits policy only if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Users can view own rate limits' 
        AND tablename = 'rate_limits'
    ) THEN
        DROP POLICY "Users can view own rate limits" ON rate_limits;
        CREATE POLICY "Users can view own rate limits" ON rate_limits
            FOR SELECT 
            TO authenticated
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- ============================================================================
-- IMPORTANT: Keep the email checking function working
-- ============================================================================

-- The check_email_exists() function should continue to work because it uses
-- SECURITY DEFINER which bypasses RLS policies entirely.
-- No changes needed to the email checking functionality.

-- ============================================================================
-- Verification: Check that all policies are still working
-- ============================================================================

-- Verify policies after running this script
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