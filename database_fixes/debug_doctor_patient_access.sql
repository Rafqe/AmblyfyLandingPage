-- Debug Doctor-Patient Access Issues
-- Run these queries to diagnose why patients aren't showing up

-- ============================================================================
-- 1. Check if doctor_user_access table exists and has data
-- ============================================================================

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'doctor_user_access'
) as table_exists;

-- Count total records in doctor_user_access
SELECT COUNT(*) as total_access_records FROM doctor_user_access;

-- Show all access records
SELECT 
    id,
    doctor_id,
    patient_id,
    granted_at
FROM doctor_user_access
ORDER BY granted_at DESC;

-- ============================================================================
-- 2. Check user accounts and types
-- ============================================================================

-- Show all users with their account types
SELECT 
    user_id,
    email,
    name,
    surname,
    account_type,
    created_at
FROM user_data
ORDER BY account_type, created_at DESC;

-- Count by account type
SELECT 
    account_type,
    COUNT(*) as count
FROM user_data
GROUP BY account_type;

-- ============================================================================
-- 3. Check doctor-patient relationships with names
-- ============================================================================

-- Show all doctor-patient relationships with readable names
SELECT 
    d.id as access_id,
    d.granted_at,
    doc.user_id as doctor_user_id,
    doc.email as doctor_email,
    doc.name as doctor_name,
    doc.surname as doctor_surname,
    pat.user_id as patient_user_id,
    pat.email as patient_email,
    pat.name as patient_name,
    pat.surname as patient_surname
FROM doctor_user_access d
LEFT JOIN user_data doc ON doc.user_id = d.doctor_id
LEFT JOIN user_data pat ON pat.user_id = d.patient_id
ORDER BY d.granted_at DESC;

-- ============================================================================
-- 4. Check RLS policies
-- ============================================================================

-- Check if RLS is enabled on doctor_user_access
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'doctor_user_access';

-- Show all RLS policies for doctor_user_access
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'doctor_user_access'
ORDER BY cmd, policyname;

-- ============================================================================
-- 5. Test the query that the frontend uses
-- ============================================================================

-- This simulates the exact query the frontend makes
-- Replace 'YOUR_DOCTOR_UUID' with the actual doctor UUID
/*
SELECT 
    patient_id,
    user_data.user_id,
    user_data.name,
    user_data.surname,
    user_data.email
FROM doctor_user_access
INNER JOIN user_data ON user_data.user_id = doctor_user_access.patient_id
WHERE doctor_id = 'YOUR_DOCTOR_UUID';
*/

-- ============================================================================
-- 6. Quick setup commands (if needed)
-- ============================================================================

-- Create a test doctor account (replace email)
-- UPDATE user_data SET account_type = 'doctor' WHERE email = 'your-email@example.com';

-- Create test access relationship (replace with actual UUIDs)
-- INSERT INTO doctor_user_access (doctor_id, patient_id)
-- VALUES ('doctor-uuid-here', 'patient-uuid-here');

-- ============================================================================
-- 7. Check helper functions exist
-- ============================================================================

-- Check if helper functions exist
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('grant_doctor_access', 'revoke_doctor_access', 'check_doctor_access')
AND routine_schema = 'public';

-- ============================================================================
-- 8. Test authentication context
-- ============================================================================

-- Check current user context (run this while logged in)
-- SELECT auth.uid() as current_user_id;

-- Check if current user is a doctor
-- SELECT 
--     user_id,
--     email,
--     account_type,
--     'This should be doctor if you are logged in as doctor' as note
-- FROM user_data 
-- WHERE user_id = auth.uid();

-- ============================================================================
-- 9. Common fixes
-- ============================================================================

-- If table doesn't exist, create it:
/*
CREATE TABLE IF NOT EXISTS doctor_user_access (
  id uuid not null default extensions.uuid_generate_v4 (),
  doctor_id uuid null,
  patient_id uuid null,
  granted_at timestamp with time zone null default now(),
  constraint doctor_user_access_pkey primary key (id),
  constraint doctor_user_access_doctor_id_fkey foreign KEY (doctor_id) references auth.users (id) on delete CASCADE,
  constraint doctor_user_access_patient_id_fkey foreign KEY (patient_id) references auth.users (id) on delete CASCADE
);

create index IF not exists doctor_user_access_doctor_idx on doctor_user_access using btree (doctor_id);
create index IF not exists doctor_user_access_patient_idx on doctor_user_access using btree (patient_id);
*/

-- If RLS policies are missing, run:
-- \i database_fixes/update_policies_for_access_table.sql 