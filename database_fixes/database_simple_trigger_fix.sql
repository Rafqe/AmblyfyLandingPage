-- Simpler, more reliable trigger to ensure emails are always populated
-- Run this after the email population fix

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS sync_user_email_trigger ON user_data;
DROP FUNCTION IF EXISTS sync_user_email();

-- Create a simpler function that ensures email is always set
CREATE OR REPLACE FUNCTION ensure_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- If email is not provided, get it from auth.users
    IF NEW.email IS NULL THEN
        SELECT email INTO NEW.email 
        FROM auth.users 
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER ensure_user_email_trigger
    BEFORE INSERT OR UPDATE ON user_data
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_email();

-- Test the trigger with a sample insert (uncomment to test)
-- INSERT INTO user_data (user_id, name, account_type) 
-- VALUES ((SELECT id FROM auth.users LIMIT 1), 'Test Name', 'user'); 