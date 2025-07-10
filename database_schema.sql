-- Database Schema for Daily Logs and Goals System

-- Update user_data table to include doctor relationship
ALTER TABLE user_data ADD COLUMN doctor_id UUID REFERENCES auth.users(id);

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_spent_minutes INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create user_goals table
CREATE TABLE IF NOT EXISTS user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_goal_minutes INTEGER NOT NULL DEFAULT 240, -- 4 hours
    weekly_goal_minutes INTEGER NOT NULL DEFAULT 1680, -- 28 hours
    set_by_doctor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS daily_logs_user_date_idx ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS daily_logs_date_idx ON daily_logs(date);
CREATE INDEX IF NOT EXISTS user_goals_user_id_idx ON user_goals(user_id);

-- Create RLS (Row Level Security) policies
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Policy for daily_logs: users can only see their own logs
CREATE POLICY "Users can view own daily logs" ON daily_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily logs" ON daily_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily logs" ON daily_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy for user_goals: users can see their own goals, doctors can see their patients' goals
CREATE POLICY "Users can view own goals" ON user_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Doctors can view patient goals" ON user_goals
    FOR SELECT USING (
        auth.uid() IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        )
    );

CREATE POLICY "Doctors can update patient goals" ON user_goals
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        )
    );

CREATE POLICY "Doctors can insert patient goals" ON user_goals
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT doctor_id FROM user_data WHERE user_id = user_goals.user_id
        ) OR auth.uid() = user_id
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default goals for existing users
INSERT INTO user_goals (user_id, daily_goal_minutes, weekly_goal_minutes)
SELECT id, 240, 1680 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_goals)
ON CONFLICT (user_id) DO NOTHING; 