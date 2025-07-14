-- Fix for user_data table policies
-- Run this in your Supabase SQL editor to fix registration issues

-- Create user_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    surname TEXT,
    account_type TEXT DEFAULT 'user',
    doctor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS on user_data table
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own data" ON user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON user_data;
DROP POLICY IF EXISTS "Users can update own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;
DROP POLICY IF EXISTS "Doctors can view patient data" ON user_data;
DROP POLICY IF EXISTS "Doctors can update patient data" ON user_data;

-- Create comprehensive RLS policies for user_data
CREATE POLICY "Users can view own data" ON user_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON user_data
    FOR DELETE USING (auth.uid() = user_id);

-- Doctors can view their patients' data
CREATE POLICY "Doctors can view patient data" ON user_data
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = doctor_id
    );

-- Doctors can update their patients' data (for assigning doctor relationships)
CREATE POLICY "Doctors can update patient data" ON user_data
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() = doctor_id OR
        -- Allow doctors to assign themselves to patients
        (doctor_id IS NULL AND account_type = 'user')
    );

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to user_data table
DROP TRIGGER IF EXISTS update_user_data_updated_at ON user_data;
CREATE TRIGGER update_user_data_updated_at 
    BEFORE UPDATE ON user_data
    FOR EACH ROW EXECUTE FUNCTION update_user_data_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS user_data_user_id_idx ON user_data(user_id);
CREATE INDEX IF NOT EXISTS user_data_doctor_id_idx ON user_data(doctor_id);

-- Fix any missing policies for user_goals that might be causing issues
DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;
CREATE POLICY "Users can insert own goals" ON user_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix any missing policies for daily_logs that might be causing issues  
DROP POLICY IF EXISTS "Users can delete own daily logs" ON daily_logs;
CREATE POLICY "Users can delete own daily logs" ON daily_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions (if needed)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_data TO authenticated;
GRANT ALL ON daily_logs TO authenticated;
GRANT ALL ON user_goals TO authenticated; 