-- URGENT: Restore critical policies that were accidentally removed
-- This adds back the necessary policies but with performance optimization

-- ============================================================================
-- Restore user_data policies with performance optimization
-- ============================================================================

-- The user_data_own_* policies might not be covering all the needed operations
-- Let's restore the missing policies but with (SELECT auth.uid()) for performance

-- Restore INSERT policy (critical for profile creation)
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- Restore UPDATE policy (needed for profile updates)  
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Restore DELETE policy (needed for account deletion)
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Ensure daily_logs policies are working
-- ============================================================================

-- Make sure all daily_logs policies exist and are optimized
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

CREATE POLICY "Users can view own daily logs" ON daily_logs
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Ensure user_goals policies are working
-- ============================================================================

-- Make sure all user_goals policies exist and are optimized
CREATE POLICY "Users can insert own goals" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
    FOR UPDATE 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- Test the functionality
-- ============================================================================

-- Check that all policies are now present and optimized
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
AND tablename IN ('user_data', 'daily_logs', 'user_goals')
AND policyname NOT LIKE '%doctor%'  -- Exclude doctor-related policies for clarity
ORDER BY tablename, cmd, policyname; 