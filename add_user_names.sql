-- Add first_name and last_name to users table
-- This migration adds name fields to the users table for better user management

ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Add missing fields to alumni_profiles table
ALTER TABLE alumni_profiles ADD COLUMN is_open_to_work BOOLEAN DEFAULT FALSE;
ALTER TABLE alumni_profiles ADD COLUMN is_available_for_mentorship BOOLEAN DEFAULT FALSE;

-- Update existing users table to have an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table if it doesn't exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for alumni_profiles table if it doesn't exist
DROP TRIGGER IF EXISTS update_alumni_profiles_updated_at ON alumni_profiles;
CREATE TRIGGER update_alumni_profiles_updated_at 
    BEFORE UPDATE ON alumni_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
