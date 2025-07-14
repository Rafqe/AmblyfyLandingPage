-- Temporary policy fix to allow email checking
-- Run this if the RLS policies are blocking the email existence check

-- Add a policy that allows reading emails for duplicate checking
CREATE POLICY "Allow email checking for duplicates" ON user_data
    FOR SELECT USING (true); 