-- Secure email existence checking without exposing user data
-- This approach uses a database function instead of broad RLS policies

-- Step 1: Remove the broad policy we created earlier
DROP POLICY IF EXISTS "Allow email existence checking" ON user_data;

-- Step 2: Create a secure function to check email existence
-- This function runs with SECURITY DEFINER, bypassing RLS for this specific check
CREATE OR REPLACE FUNCTION check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    email_count INTEGER;
BEGIN
    -- Only allow email checking, return true/false without exposing any user data
    SELECT COUNT(*) INTO email_count
    FROM user_data
    WHERE email = LOWER(TRIM(check_email))
    LIMIT 1;
    
    RETURN email_count > 0;
END;
$$;

-- Step 3: Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO anon, authenticated;

-- Step 4: Create a more restrictive RLS policy for normal user data access
-- This ensures users can only see their own data for normal operations
CREATE POLICY "Users can view own data only" ON user_data
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Step 5: Allow users to insert their own data (for registration)
CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Step 6: Allow users to update their own data
CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);

-- Step 7: Allow users to delete their own data
CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- Test the function (replace with actual email)
-- SELECT check_email_exists('rairlabs@gmail.com'); 