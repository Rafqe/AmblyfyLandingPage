-- Debug queries to check the current state of user_data table
-- Run these in your Supabase SQL editor to verify the email data

-- 1. Check if email column exists and has data
SELECT 
    user_id,
    email,
    name,
    surname,
    account_type,
    created_at
FROM user_data
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if any emails are populated
SELECT 
    COUNT(*) as total_records,
    COUNT(email) as records_with_email,
    COUNT(DISTINCT email) as unique_emails
FROM user_data;

-- 3. Check for any duplicate emails (should be 0 if unique constraint is working)
SELECT 
    email,
    COUNT(*) as count
FROM user_data
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- 4. Check if the unique index exists
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_data' AND indexname = 'user_data_email_unique_idx';

-- 5. Check current RLS policies on user_data
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'user_data';

-- 6. Test a simple email check (replace 'test@example.com' with an actual email)
-- SELECT email FROM user_data WHERE email = 'test@example.com' LIMIT 1; 