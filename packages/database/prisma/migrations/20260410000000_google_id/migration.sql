-- Add google_id column to usuarios table
ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE;
