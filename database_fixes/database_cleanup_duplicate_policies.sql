-- Clean up duplicate RLS policies causing performance warnings
-- This removes the unoptimized policies since you already have optimized versions

-- Remove duplicate unoptimized policies on user_data
-- Keep the optimized ones: user_data_own_access, user_data_own_delete, user_data_own_insert, user_data_own_update

DROP POLICY IF EXISTS "Users can view own data only" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data; 
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;

-- Keep "Users can view own data" since it's already optimized
-- The user_data_own_* policies are already optimized and working

-- Verify remaining policies after cleanup
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
AND tablename = 'user_data'
ORDER BY policyname; 