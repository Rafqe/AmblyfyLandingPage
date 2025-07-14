-- Template for cleaning up duplicate policies
-- IMPORTANT: First run check_duplicate_policies.sql to see what you have
-- Then uncomment and modify the lines below based on your specific duplicates

-- ============================================================================
-- GENERAL PRINCIPLE:
-- 1. Keep policies that use "(SELECT auth.uid())" - these are optimized
-- 2. Delete policies that use "auth.uid()" directly - these cause performance warnings
-- 3. Keep newer/cleaner policy names, delete older/messier ones
-- ============================================================================

-- Example cleanup (UNCOMMENT AND MODIFY based on your actual policy names):

-- If you have both "Users can view own data" and "Users can view own data only":
-- DROP POLICY IF EXISTS "Users can view own data only" ON user_data;
-- (Keep "Users can view own data" if it's optimized)

-- If you have multiple similar user_data view policies:
-- DROP POLICY IF EXISTS "Users can view own data only" ON user_data;
-- DROP POLICY IF EXISTS "user_data_own_access" ON user_data;  -- if this is unoptimized
-- (Keep the one that uses "(SELECT auth.uid())")

-- Common duplicate patterns to clean up:

-- user_data table duplicates:
-- DROP POLICY IF EXISTS "Users can insert own data" ON user_data;  -- if unoptimized
-- DROP POLICY IF EXISTS "Users can update own data" ON user_data;  -- if unoptimized  
-- DROP POLICY IF EXISTS "Users can delete own data" ON user_data;  -- if unoptimized

-- daily_logs table duplicates:
-- DROP POLICY IF EXISTS "Users can view own daily logs" ON daily_logs;  -- if unoptimized
-- DROP POLICY IF EXISTS "Users can insert own daily logs" ON daily_logs;  -- if unoptimized
-- DROP POLICY IF EXISTS "Users can update own daily logs" ON daily_logs;  -- if unoptimized
-- DROP POLICY IF EXISTS "Users can delete own daily logs" ON daily_logs;  -- if unoptimized

-- user_goals table duplicates:
-- DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;  -- if unoptimized
-- DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;  -- if unoptimized

-- ============================================================================
-- STEP-BY-STEP PROCESS:
-- ============================================================================

-- 1. Run the queries in check_duplicate_policies.sql
-- 2. Look at the "policy_count" results to see which tables have duplicates
-- 3. Look at the "optimization_status" results to see which are OPTIMIZED vs UNOPTIMIZED
-- 4. Delete the UNOPTIMIZED versions if you have OPTIMIZED versions that do the same thing
-- 5. Run the verification query below to confirm you still have all needed policies

-- ============================================================================
-- VERIFICATION QUERY (run after cleanup):
-- ============================================================================

-- After cleanup, run this to make sure you have all essential policies:
/*
SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as remaining_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'doctor_user_access', 'doctor_invitations')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
*/

-- You should have AT LEAST these policies for basic functionality:
-- user_data: SELECT, INSERT, UPDATE, DELETE (1 each)
-- daily_logs: SELECT, INSERT, UPDATE, DELETE (1 each) 
-- user_goals: SELECT, INSERT, UPDATE (1 each)
-- doctor_user_access: SELECT, INSERT, DELETE (1 each)
-- doctor_invitations: SELECT, INSERT, UPDATE (1 each) 