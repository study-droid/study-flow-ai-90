-- Add setup_completed field to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_setup_completed ON profiles(setup_completed);

-- Update existing profiles to mark them as setup completed (since they're existing users)
UPDATE profiles 
SET setup_completed = true 
WHERE setup_completed IS NULL;