-- Clean up and organize RLS policies for user_data table
-- Run this after the secure email check function setup

-- Remove any old or conflicting policies
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;
DROP POLICY IF EXISTS "Doctors can view patient data" ON user_data;
DROP POLICY IF EXISTS "Doctors can update patient data" ON user_data;
DROP POLICY IF EXISTS "Allow email checking for duplicates" ON user_data;

-- Set up clean, secure RLS policies
-- 1. Users can view only their own data
CREATE POLICY "Users view own data" ON user_data
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- 2. Users can insert only their own data (for registration)
CREATE POLICY "Users insert own data" ON user_data
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update only their own data
CREATE POLICY "Users update own data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete only their own data
CREATE POLICY "Users delete own data" ON user_data
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Doctors can view their patients' data (if you have doctor functionality)
CREATE POLICY "Doctors view patient data" ON user_data
    FOR SELECT 
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        auth.uid() = doctor_id
    );

-- 6. Doctors can update their patients' data
CREATE POLICY "Doctors update patient data" ON user_data
    FOR UPDATE 
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        auth.uid() = doctor_id
    )
    WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid() = doctor_id
    );

-- Verify policies are set up correctly
SELECT policyname, cmd, permissive, roles 
FROM pg_policies 
WHERE tablename = 'user_data'
ORDER BY policyname; 