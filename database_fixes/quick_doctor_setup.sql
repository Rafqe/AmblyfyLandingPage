-- Quick Doctor Dashboard Setup
-- Run this to create test data and see patients in the doctor dashboard

-- ============================================================================
-- Step 1: Check your current account
-- ============================================================================

-- See your current user info
SELECT 
    user_id,
    email,
    name,
    surname,
    account_type,
    'This is your current account' as note
FROM user_data 
WHERE user_id = auth.uid();

-- ============================================================================
-- Step 2: Convert your account to doctor (if not already)
-- ============================================================================

-- Make yourself a doctor
UPDATE user_data 
SET account_type = 'doctor' 
WHERE user_id = auth.uid();

-- Verify the change
SELECT 
    user_id,
    email,
    account_type,
    'You should now be a doctor' as note
FROM user_data 
WHERE user_id = auth.uid();

-- ============================================================================
-- Step 3: Find or create patients
-- ============================================================================

-- Check existing patients
SELECT 
    user_id,
    email,
    name,
    surname,
    'Existing patients' as note
FROM user_data 
WHERE account_type = 'user'
AND user_id != auth.uid();

-- If no patients exist, you need to register another account or manually create one
-- For testing, you can temporarily convert another account to patient:
-- UPDATE user_data SET account_type = 'user' WHERE email = 'patient@example.com';

-- ============================================================================
-- Step 4: Grant yourself access to patients
-- ============================================================================

-- Method 1: Grant access to ALL existing patients (for testing)
INSERT INTO doctor_user_access (doctor_id, patient_id)
SELECT 
    auth.uid() as doctor_id,
    user_id as patient_id
FROM user_data 
WHERE account_type = 'user'
AND user_id != auth.uid()
ON CONFLICT DO NOTHING;

-- Method 2: Grant access to specific patient (replace with actual patient email)
/*
INSERT INTO doctor_user_access (doctor_id, patient_id)
SELECT 
    auth.uid() as doctor_id,
    user_id as patient_id
FROM user_data 
WHERE email = 'patient@example.com'
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- Step 5: Verify the setup
-- ============================================================================

-- Check your doctor-patient relationships
SELECT 
    d.id as access_id,
    d.granted_at,
    'You (doctor)' as doctor_note,
    pat.email as patient_email,
    pat.name as patient_name,
    pat.surname as patient_surname
FROM doctor_user_access d
LEFT JOIN user_data pat ON pat.user_id = d.patient_id
WHERE d.doctor_id = auth.uid()
ORDER BY d.granted_at DESC;

-- Count your patients
SELECT 
    COUNT(*) as total_patients,
    'This is how many patients you have access to' as note
FROM doctor_user_access 
WHERE doctor_id = auth.uid();

-- ============================================================================
-- Step 6: Create sample goals for patients (optional)
-- ============================================================================

-- Ensure all your patients have goals set
INSERT INTO user_goals (user_id, daily_goal_minutes, weekly_goal_minutes, set_by_doctor_id)
SELECT 
    d.patient_id,
    240, -- 4 hours daily
    1680, -- 28 hours weekly
    auth.uid() -- Set by you (the doctor)
FROM doctor_user_access d
WHERE d.doctor_id = auth.uid()
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- Success message
-- ============================================================================

SELECT 
    'Setup complete! 🎉' as status,
    'Refresh your doctor dashboard to see patients' as instruction; 