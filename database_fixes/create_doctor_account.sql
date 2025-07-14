-- Create Doctor Account for Testing
-- Run this in your Supabase SQL editor to create or convert a doctor account

-- Option 1: Convert existing account to doctor (replace with your email)
UPDATE user_data 
SET account_type = 'doctor' 
WHERE email = 'your-email@example.com';

-- Option 2: Create a new doctor account (after registering through the normal signup)
-- First register normally, then run this to convert to doctor:
-- UPDATE user_data 
-- SET account_type = 'doctor' 
-- WHERE user_id = 'your-user-id-here';

-- Option 3: Check what accounts exist and their types
SELECT 
    user_id,
    email,
    name,
    surname,
    account_type,
    created_at
FROM user_data
ORDER BY created_at DESC;

-- Option 4: Create a patient-doctor relationship (for testing patient management)
-- UPDATE user_data 
-- SET doctor_id = 'doctor-user-id-here' 
-- WHERE email = 'patient-email@example.com';

-- Verify the changes
SELECT 
    user_id,
    email,
    name,
    surname,
    account_type,
    doctor_id,
    created_at
FROM user_data
WHERE account_type = 'doctor'
ORDER BY created_at DESC; 