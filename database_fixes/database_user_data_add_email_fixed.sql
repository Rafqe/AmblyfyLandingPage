-- Add email field to user_data table for better duplicate checking
-- Run this in your Supabase SQL editor

-- Step 1: Add email column to user_data table
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Update existing records to populate email from auth.users
UPDATE user_data 
SET email = auth_users.email 
FROM auth.users auth_users 
WHERE user_data.user_id = auth_users.id 
AND user_data.email IS NULL;

-- Step 3: Remove any potential duplicate records (keep the oldest one)
DELETE FROM user_data 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM user_data 
    GROUP BY email
    HAVING email IS NOT NULL
);

-- Step 4: Create unique index on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_data_email_unique_idx 
ON user_data(email) 
WHERE email IS NOT NULL;

-- Step 5: Create a function to automatically sync email from auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Get email from auth.users and set it in user_data
    SELECT email INTO NEW.email 
    FROM auth.users 
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to automatically populate email on insert
DROP TRIGGER IF EXISTS sync_user_email_trigger ON user_data;
CREATE TRIGGER sync_user_email_trigger
    BEFORE INSERT ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_email();

-- Step 7: Update RLS policies to include email checking
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ); 