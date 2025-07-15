-- ============================================
-- SQL Commands to Revert Blog Functionality
-- ============================================
-- Run these commands in your Supabase SQL editor
-- or psql to completely remove blog-related database objects

-- 1. Drop the blog_posts table if it exists
DROP TABLE IF EXISTS public.blog_posts CASCADE;

-- 2. Remove any RLS policies related to blog_posts 
-- (These will be automatically dropped with CASCADE, but including for completeness)
-- DROP POLICY IF EXISTS "Anyone can read published blog posts" ON public.blog_posts;
-- DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;

-- 3. Remove any functions related to blog management
-- (Add any custom functions here if they were created)

-- 4. Remove any triggers related to blog posts
-- (These will be automatically dropped with CASCADE)

-- 5. Clean up any sequences that might have been created
-- (Supabase usually handles this automatically)

-- 6. Optional: Clean up any blog-related user roles or permissions
-- (Only run these if you created specific blog admin roles)
-- REVOKE ALL ON public.blog_posts FROM authenticated;
-- REVOKE ALL ON public.blog_posts FROM anon;

-- ============================================
-- Verification Commands
-- ============================================
-- Run these to verify everything was cleaned up:

-- Check if blog_posts table exists (should return empty)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'blog_posts'
);

-- Check for any remaining blog-related policies (should return empty)
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE '%blog%';

-- Check for any remaining blog-related functions (should return empty)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%blog%';

-- ============================================
-- Notes:
-- ============================================
-- - The CASCADE option will automatically drop any dependent objects
-- - If you had any custom triggers, functions, or procedures related to blogs, add them here
-- - If you had any foreign keys from other tables pointing to blog_posts, those will also be dropped
-- - All RLS policies on the blog_posts table will be automatically removed
-- ============================================ 