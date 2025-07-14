-- Setup Test Data for Doctor-Patient Access System
-- Run this after creating the doctor_user_access table and updating policies

-- ============================================================================
-- 1. Create/Convert Doctor Account
-- ============================================================================

-- Convert an existing account to doctor (replace with actual email)
-- UPDATE user_data 
-- SET account_type = 'doctor' 
-- WHERE email = 'doctor@example.com';

-- ============================================================================
-- 2. Create/Convert Patient Accounts
-- ============================================================================

-- Convert existing accounts to patients (replace with actual emails)
-- UPDATE user_data 
-- SET account_type = 'user' 
-- WHERE email IN ('patient1@example.com', 'patient2@example.com');

-- ============================================================================
-- 3. Grant Doctor Access to Patients
-- ============================================================================

-- Method 1: Using the helper function (recommended)
-- SELECT grant_doctor_access(
--     'doctor-uuid-here',
--     'patient-uuid-here'
-- );

-- Method 2: Direct insert
-- INSERT INTO doctor_user_access (doctor_id, patient_id)
-- VALUES 
--     ('doctor-uuid-here', 'patient1-uuid-here'),
--     ('doctor-uuid-here', 'patient2-uuid-here');

-- ============================================================================
-- 4. Helper Queries to Find UUIDs
-- ============================================================================

-- Find all users and their UUIDs
SELECT 
    user_id,
    email,
    name,
    surname,
    account_type,
    created_at
FROM user_data
ORDER BY account_type, created_at DESC;

-- Find doctor UUIDs
SELECT 
    user_id,
    email,
    name,
    surname,
    'Use this UUID as doctor_id' as note
FROM user_data
WHERE account_type = 'doctor';

-- Find patient UUIDs
SELECT 
    user_id,
    email,
    name,
    surname,
    'Use this UUID as patient_id' as note
FROM user_data
WHERE account_type = 'user';

-- ============================================================================
-- 5. Quick Setup Script (Update the UUIDs below)
-- ============================================================================

-- Step 1: Update these with your actual UUIDs
DO $$
DECLARE
    doctor_uuid UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with actual doctor UUID
    patient1_uuid UUID := '11111111-1111-1111-1111-111111111111'; -- Replace with actual patient UUID
    patient2_uuid UUID := '22222222-2222-2222-2222-222222222222'; -- Replace with actual patient UUID
BEGIN
    -- Only run if UUIDs are updated (not the default placeholders)
    IF doctor_uuid != '00000000-0000-0000-0000-000000000000' THEN
        -- Grant access to patients
        PERFORM grant_doctor_access(doctor_uuid, patient1_uuid);
        PERFORM grant_doctor_access(doctor_uuid, patient2_uuid);
        
        RAISE NOTICE 'Doctor access granted successfully!';
    ELSE
        RAISE NOTICE 'Please update the UUIDs in the script before running!';
    END IF;
END $$;

-- ============================================================================
-- 6. Verification Queries
-- ============================================================================

-- Check all doctor-patient relationships
SELECT 
    d.id as access_id,
    d.doctor_id,
    d.patient_id,
    d.granted_at,
    doc.name as doctor_name,
    doc.surname as doctor_surname,
    doc.email as doctor_email,
    pat.name as patient_name,
    pat.surname as patient_surname,
    pat.email as patient_email
FROM doctor_user_access d
LEFT JOIN user_data doc ON doc.user_id = d.doctor_id
LEFT JOIN user_data pat ON pat.user_id = d.patient_id
ORDER BY d.granted_at DESC;

-- Check if specific doctor has access to specific patient
-- SELECT check_doctor_access(
--     'doctor-uuid-here',
--     'patient-uuid-here'
-- ) as has_access;

-- ============================================================================
-- 7. Sample Data Creation (Optional)
-- ============================================================================

-- Create sample goals for patients (if they don't exist)
-- INSERT INTO user_goals (user_id, daily_goal_minutes, weekly_goal_minutes)
-- SELECT 
--     user_id,
--     240, -- 4 hours daily
--     1680 -- 28 hours weekly
-- FROM user_data
-- WHERE account_type = 'user'
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 8. Cleanup Commands (if needed)
-- ============================================================================

-- Remove all doctor-patient relationships
-- DELETE FROM doctor_user_access;

-- Remove specific doctor-patient relationship
-- DELETE FROM doctor_user_access 
-- WHERE doctor_id = 'doctor-uuid-here' AND patient_id = 'patient-uuid-here';

-- Convert all accounts back to regular users
-- UPDATE user_data SET account_type = 'user'; 