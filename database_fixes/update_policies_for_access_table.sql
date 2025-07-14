-- Update Database Policies for doctor_user_access Table
-- Run this after creating the doctor_user_access table

-- ============================================================================
-- 1. Enable RLS on the new doctor_user_access table
-- ============================================================================

ALTER TABLE doctor_user_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Create RLS policies for doctor_user_access table
-- ============================================================================

-- Doctors can view their own access grants
CREATE POLICY "Doctors can view their access grants" ON doctor_user_access
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = doctor_id);

-- Doctors can insert access grants (if they need to assign themselves to patients)
CREATE POLICY "Doctors can insert access grants" ON doctor_user_access
    FOR INSERT 
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = doctor_id);

-- Doctors can delete their own access grants
CREATE POLICY "Doctors can delete their access grants" ON doctor_user_access
    FOR DELETE 
    TO authenticated
    USING ((SELECT auth.uid()) = doctor_id);

-- Patients can view who has access to them
CREATE POLICY "Patients can view their doctor access" ON doctor_user_access
    FOR SELECT 
    TO authenticated
    USING ((SELECT auth.uid()) = patient_id);

-- ============================================================================
-- 3. Update user_goals policies to use doctor_user_access table
-- ============================================================================

-- Drop existing doctor-related policies
DROP POLICY IF EXISTS "Doctors can view patient goals" ON user_goals;
DROP POLICY IF EXISTS "Doctors can update patient goals" ON user_goals;
DROP POLICY IF EXISTS "Doctors can insert patient goals" ON user_goals;

-- Create new policies using doctor_user_access table
CREATE POLICY "Doctors can view patient goals via access" ON user_goals
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM doctor_user_access 
            WHERE patient_id = user_goals.user_id
        )
    );

CREATE POLICY "Doctors can update patient goals via access" ON user_goals
    FOR UPDATE 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM doctor_user_access 
            WHERE patient_id = user_goals.user_id
        )
    );

CREATE POLICY "Doctors can insert patient goals via access" ON user_goals
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = user_id OR
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM doctor_user_access 
            WHERE patient_id = user_id
        )
    );

-- ============================================================================
-- 4. Update daily_logs policies to use doctor_user_access table (optional)
-- ============================================================================

-- If you want doctors to be able to view patient daily logs
CREATE POLICY "Doctors can view patient daily logs via access" ON daily_logs
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM doctor_user_access 
            WHERE patient_id = daily_logs.user_id
        )
    );

-- ============================================================================
-- 5. Update user_data policies to use doctor_user_access table
-- ============================================================================

-- Drop old doctor policies
DROP POLICY IF EXISTS "Doctors can view patient data" ON user_data;
DROP POLICY IF EXISTS "Doctors can update patient data" ON user_data;

-- Create new policies using doctor_user_access table
CREATE POLICY "Doctors can view patient data via access" ON user_data
    FOR SELECT 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM doctor_user_access 
            WHERE patient_id = user_data.user_id
        )
    );

CREATE POLICY "Doctors can update patient data via access" ON user_data
    FOR UPDATE 
    TO authenticated
    USING (
        (SELECT auth.uid()) = user_id OR
        (SELECT auth.uid()) IN (
            SELECT doctor_id FROM doctor_user_access 
            WHERE patient_id = user_data.user_id
        )
    );

-- ============================================================================
-- 6. Create helper functions for managing doctor-patient access
-- ============================================================================

-- Function to grant doctor access to a patient
CREATE OR REPLACE FUNCTION grant_doctor_access(
    p_doctor_id UUID,
    p_patient_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Check if access already exists
    IF EXISTS (
        SELECT 1 FROM doctor_user_access 
        WHERE doctor_id = p_doctor_id AND patient_id = p_patient_id
    ) THEN
        RETURN TRUE; -- Access already exists
    END IF;
    
    -- Grant access
    INSERT INTO doctor_user_access (doctor_id, patient_id)
    VALUES (p_doctor_id, p_patient_id);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to revoke doctor access from a patient
CREATE OR REPLACE FUNCTION revoke_doctor_access(
    p_doctor_id UUID,
    p_patient_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    DELETE FROM doctor_user_access 
    WHERE doctor_id = p_doctor_id AND patient_id = p_patient_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to check if doctor has access to patient
CREATE OR REPLACE FUNCTION check_doctor_access(
    p_doctor_id UUID,
    p_patient_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM doctor_user_access 
        WHERE doctor_id = p_doctor_id AND patient_id = p_patient_id
    );
END;
$$;

-- Grant permissions for the helper functions
GRANT EXECUTE ON FUNCTION grant_doctor_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_doctor_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_doctor_access(UUID, UUID) TO authenticated;

-- ============================================================================
-- 7. Migration: Convert existing doctor_id relationships to access grants
-- ============================================================================

-- Convert existing doctor_id relationships to doctor_user_access entries
INSERT INTO doctor_user_access (doctor_id, patient_id)
SELECT doctor_id, user_id 
FROM user_data 
WHERE doctor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. Verification queries
-- ============================================================================

-- Check existing doctor-patient relationships
SELECT 
    d.doctor_id,
    d.patient_id,
    d.granted_at,
    doc.name as doctor_name,
    doc.surname as doctor_surname,
    pat.name as patient_name,
    pat.surname as patient_surname
FROM doctor_user_access d
LEFT JOIN user_data doc ON doc.user_id = d.doctor_id
LEFT JOIN user_data pat ON pat.user_id = d.patient_id
ORDER BY d.granted_at DESC;

-- Check all policies are properly set
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('doctor_user_access', 'user_goals', 'daily_logs', 'user_data')
ORDER BY tablename, cmd, policyname; 