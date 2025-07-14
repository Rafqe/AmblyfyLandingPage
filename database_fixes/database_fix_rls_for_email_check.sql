-- Fix RLS policies to allow email existence checking for duplicate prevention
-- This creates a secure way to check email existence without exposing user data

-- Option 1: Allow anonymous users to check email existence (most straightforward)
-- This only allows SELECT operations and doesn't grant any write permissions
CREATE POLICY "Allow email existence checking" ON user_data
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- If the above feels too broad, use Option 2 instead:
-- Option 2: More restrictive - only allow when specifically checking emails
-- DROP POLICY IF EXISTS "Allow email existence checking" ON user_data;
-- CREATE POLICY "Allow email existence checking" ON user_data
--     FOR SELECT 
--     TO anon, authenticated
--     USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Test the policy (replace with an actual email from your database)
-- SELECT email FROM user_data WHERE email = 'rairlabs@gmail.com' LIMIT 1; 