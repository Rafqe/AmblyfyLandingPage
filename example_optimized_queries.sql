-- ============================================
-- Example SQL Queries (for understanding only)
-- ============================================
-- These show the optimization implemented in the JavaScript code
-- Replace 'your-doctor-id-here' with an actual doctor UUID

-- OLD APPROACH (2 separate queries):
-- ---------------------------------
-- Query 1: Get patient IDs
SELECT patient_id 
FROM doctor_user_access 
WHERE doctor_id = 'your-doctor-id-here';

-- Query 2: Get patient details (would need the results from Query 1)
SELECT user_id, name, surname, email 
FROM user_data 
WHERE user_id IN (
  'patient-id-1', 'patient-id-2', 'patient-id-3'  -- Results from Query 1
);


-- NEW APPROACH (1 optimized query with JOIN):
-- -------------------------------------------
SELECT 
  dua.patient_id,
  ud.user_id,
  ud.name,
  ud.surname,
  ud.email
FROM doctor_user_access dua
INNER JOIN user_data ud ON dua.patient_id = ud.user_id
WHERE dua.doctor_id = 'your-doctor-id-here';


-- ============================================
-- Supabase JavaScript Query Builder Equivalent
-- ============================================
-- This is what's actually implemented in the code:

/*
const { data: patientsData, error } = await supabase
  .from("doctor_user_access")
  .select(`
    patient_id,
    user_data!inner (
      user_id,
      name,
      surname,
      email
    )
  `)
  .eq("doctor_id", user.id);
*/

-- ============================================
-- Performance Benefits:
-- ============================================
-- ✅ Reduced network round-trips (1 query vs 2)
-- ✅ Reduced database load
-- ✅ Faster response times
-- ✅ Automatic caching implemented in JavaScript
-- ============================================ 