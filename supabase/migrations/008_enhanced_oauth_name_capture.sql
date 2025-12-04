-- Enhanced OAuth name capture for better user profile creation
-- This migration improves the handle_new_user function to better extract names from OAuth providers

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create enhanced function to handle user creation with better name extraction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
  extracted_email TEXT;
BEGIN
  -- Extract email
  extracted_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  
  -- Extract name with multiple fallback strategies
  extracted_name := COALESCE(
    -- Primary: full_name from metadata
    NEW.raw_user_meta_data->>'full_name',
    -- Secondary: name from metadata
    NEW.raw_user_meta_data->>'name',
    -- Tertiary: first_name + last_name from metadata
    CASE 
      WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'last_name' IS NOT NULL
      THEN CONCAT(
        TRIM(NEW.raw_user_meta_data->>'first_name'), 
        ' ', 
        TRIM(NEW.raw_user_meta_data->>'last_name')
      )
      WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL
      THEN TRIM(NEW.raw_user_meta_data->>'first_name')
      ELSE NULL
    END,
    -- Quaternary: given_name + family_name from metadata (Google OAuth)
    CASE 
      WHEN NEW.raw_user_meta_data->>'given_name' IS NOT NULL 
        AND NEW.raw_user_meta_data->>'family_name' IS NOT NULL
      THEN CONCAT(
        TRIM(NEW.raw_user_meta_data->>'given_name'), 
        ' ', 
        TRIM(NEW.raw_user_meta_data->>'family_name')
      )
      WHEN NEW.raw_user_meta_data->>'given_name' IS NOT NULL
      THEN TRIM(NEW.raw_user_meta_data->>'given_name')
      ELSE NULL
    END,
    -- Quinary: nickname from metadata
    NEW.raw_user_meta_data->>'nickname',
    -- Senary: preferred_username from metadata
    NEW.raw_user_meta_data->>'preferred_username',
    -- Last resort: null (will trigger name capture modal)
    NULL
  );

  -- Insert profile with extracted data
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    extracted_email,
    CASE 
      WHEN extracted_name IS NOT NULL AND LENGTH(TRIM(extracted_name)) > 0 
      THEN TRIM(extracted_name)
      ELSE NULL 
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the enhanced function
COMMENT ON FUNCTION public.handle_new_user() IS 'Enhanced user creation function that extracts names from various OAuth provider metadata formats including Google (given_name/family_name), LinkedIn (name), and generic (first_name/last_name) patterns';
