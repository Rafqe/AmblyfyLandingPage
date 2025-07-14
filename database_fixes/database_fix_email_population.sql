-- Fix email population in user_data table
-- This should resolve the empty data issue

-- Step 1: First, let's see what we have
SELECT 'Before fix - user_data records:' as status, COUNT(*) as count FROM user_data;
SELECT 'Before fix - emails populated:' as status, COUNT(*) as count FROM user_data WHERE email IS NOT NULL;

-- Step 2: Update existing user_data records to include emails from auth.users
UPDATE user_data 
SET email = auth_users.email 
FROM auth.users auth_users 
WHERE user_data.user_id = auth_users.id;

-- Step 3: For any auth.users that don't have user_data records, create them
INSERT INTO user_data (user_id, email, account_type)
SELECT 
    au.id as user_id,
    au.email,
    'user' as account_type
FROM auth.users au
LEFT JOIN user_data ud ON au.id = ud.user_id
WHERE ud.user_id IS NULL;

-- Step 4: Verify the fix
SELECT 'After fix - user_data records:' as status, COUNT(*) as count FROM user_data;
SELECT 'After fix - emails populated:' as status, COUNT(*) as count FROM user_data WHERE email IS NOT NULL;

-- Step 5: Show some sample data (remove if you don't want to see emails)
SELECT user_id, email, name, surname, account_type FROM user_data LIMIT 5; 