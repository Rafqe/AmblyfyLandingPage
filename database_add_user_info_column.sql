-- Add info column to user_data table for additional user/doctor information
-- This allows doctors to add workplace info, specializations, or other details

-- Add the info column (can store workplace, specialization, bio, etc.)
ALTER TABLE user_data 
ADD COLUMN info TEXT;

-- Add a comment to document the column purpose
COMMENT ON COLUMN user_data.info IS 'Additional information for users/doctors (workplace, specialization, bio, etc.)';

-- Create an index for better search performance if needed later
CREATE INDEX IF NOT EXISTS user_data_info_idx ON user_data USING gin (to_tsvector('english', info));

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_data' 
AND column_name = 'info'; 