-- Query to identify all current RLS policies and find duplicates
-- Run this in your Supabase SQL editor to see what policies you have

-- First, let's see ALL policies on your main tables
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
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'doctor_user_access', 'doctor_invitations', 'audit_log', 'rate_limits')
ORDER BY tablename, cmd, policyname;

-- Next, let's identify policies that might be duplicates by function
-- (same table + same command type, which suggests they do the same thing)
SELECT 
    tablename,
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'doctor_user_access', 'doctor_invitations', 'audit_log', 'rate_limits')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- Finally, let's look for policies with very similar names (potential duplicates)
SELECT 
    tablename,
    cmd,
    policyname,
    CASE 
        WHEN policyname LIKE '%can view own%' THEN 'USER_VIEW_OWN'
        WHEN policyname LIKE '%can insert own%' THEN 'USER_INSERT_OWN'
        WHEN policyname LIKE '%can update own%' THEN 'USER_UPDATE_OWN'
        WHEN policyname LIKE '%can delete own%' THEN 'USER_DELETE_OWN'
        WHEN policyname LIKE '%doctor%view%patient%' THEN 'DOCTOR_VIEW_PATIENT'
        WHEN policyname LIKE '%doctor%update%patient%' THEN 'DOCTOR_UPDATE_PATIENT'
        WHEN policyname LIKE '%doctor%insert%patient%' THEN 'DOCTOR_INSERT_PATIENT'
        ELSE 'OTHER'
    END as policy_type,
    -- Show if policy uses optimized (SELECT auth.uid()) pattern
    CASE 
        WHEN qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%' THEN 'OPTIMIZED'
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN 'UNOPTIMIZED'
        ELSE 'UNKNOWN'
    END as optimization_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'doctor_user_access', 'doctor_invitations', 'audit_log', 'rate_limits')
ORDER BY tablename, cmd, policy_type;

-- RECOMMENDATION QUERIES:
-- To help you decide which policies to keep, run these additional queries:

-- 1. Show policies that are definitely optimized (these are the ones to KEEP)
SELECT tablename, cmd, policyname, 'KEEP - OPTIMIZED' as recommendation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'doctor_user_access', 'doctor_invitations')
AND (qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%')
ORDER BY tablename, cmd;

-- 2. Show policies that are unoptimized (candidates for DELETION if duplicates exist)
SELECT tablename, cmd, policyname, 'CONSIDER DELETING - UNOPTIMIZED' as recommendation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_data', 'daily_logs', 'user_goals', 'doctor_user_access', 'doctor_invitations')
AND (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
OR (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
ORDER BY tablename, cmd; 