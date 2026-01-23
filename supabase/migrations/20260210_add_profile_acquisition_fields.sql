-- Add acquisition metadata to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acquisition_utm JSONB,
  ADD COLUMN IF NOT EXISTS acquisition_referrer TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_first_landing_url TEXT,
  ADD COLUMN IF NOT EXISTS signup_ip INET,
  ADD COLUMN IF NOT EXISTS signup_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS signup_alert_sent_at TIMESTAMPTZ;

-- Refresh handle_new_user to persist acquisition metadata from auth user records
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_name TEXT;
  extracted_email TEXT;
  acquisition_utm JSONB;
  acquisition_referrer TEXT;
  acquisition_landing_url TEXT;
BEGIN
  extracted_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');

  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
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
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'preferred_username',
    NULL
  );

  acquisition_utm := COALESCE(
    NEW.raw_user_meta_data->'acquisition'->'utm',
    NEW.raw_user_meta_data->'utm'
  );

  acquisition_referrer := COALESCE(
    NEW.raw_user_meta_data->'acquisition'->>'referrer',
    NEW.raw_user_meta_data->>'referrer'
  );

  acquisition_landing_url := COALESCE(
    NEW.raw_user_meta_data->'acquisition'->>'landing_url',
    NEW.raw_user_meta_data->'acquisition'->>'first_landing_url',
    NEW.raw_user_meta_data->>'landing_url',
    NEW.raw_user_meta_data->>'first_landing_url'
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    acquisition_utm,
    acquisition_referrer,
    acquisition_first_landing_url
  )
  VALUES (
    NEW.id,
    extracted_email,
    CASE
      WHEN extracted_name IS NOT NULL AND LENGTH(TRIM(extracted_name)) > 0
      THEN TRIM(extracted_name)
      ELSE NULL
    END,
    acquisition_utm,
    acquisition_referrer,
    acquisition_landing_url
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Enhanced user creation function that extracts names and acquisition metadata from auth user metadata.';
