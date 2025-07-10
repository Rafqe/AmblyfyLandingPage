-- Migration to fix multiple entries per day issue
-- This removes the UNIQUE constraint that prevents multiple daily_logs entries per user per date

-- Drop the existing unique constraint
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_id_date_key;

-- Also check for alternative constraint names that might exist
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_date_key;
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS unique_user_date;

-- Verify the constraint is removed by listing remaining constraints
-- (This is just for verification - you can run this separately)
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'daily_logs'::regclass;

-- The table should now allow multiple entries per user per date
-- The existing index daily_logs_user_date_idx can remain for performance 