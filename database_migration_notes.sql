-- Migration to add notes column to daily_logs table
-- Run this if you already have the daily_logs table without the notes column

ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS notes TEXT; 