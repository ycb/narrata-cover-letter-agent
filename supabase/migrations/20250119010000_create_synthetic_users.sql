-- Create synthetic users system for admin testing
CREATE TABLE public.synthetic_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id uuid NOT NULL REFERENCES public.profiles(id),
  profile_id text NOT NULL, -- "P01", "P02", etc.
  profile_name text NOT NULL, -- "Avery Chen", "Jordan Alvarez"
  email text NOT NULL, -- "p01@test.narrata.ai"
  is_active boolean DEFAULT false,
  profile_data jsonb, -- Store full persona data
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure only one active profile per parent user
  UNIQUE(parent_user_id, is_active) WHERE is_active = true,
  UNIQUE(parent_user_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.synthetic_users ENABLE ROW LEVEL SECURITY;

-- Create policies - only admin users can access
CREATE POLICY "Admin users can view synthetic users" ON public.synthetic_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = parent_user_id 
      AND (role = 'admin' OR email = 'narrata.ai@gmail.com')
    )
  );

CREATE POLICY "Admin users can manage synthetic users" ON public.synthetic_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = parent_user_id 
      AND (role = 'admin' OR email = 'narrata.ai@gmail.com')
    )
  );

-- Create indexes
CREATE INDEX idx_synthetic_users_parent_user_id ON public.synthetic_users(parent_user_id);
CREATE INDEX idx_synthetic_users_profile_id ON public.synthetic_users(profile_id);
CREATE INDEX idx_synthetic_users_is_active ON public.synthetic_users(is_active);

-- Function to create synthetic users from persona data
CREATE OR REPLACE FUNCTION create_synthetic_users_from_personas()
RETURNS void AS $$
DECLARE
  persona_data jsonb;
  persona jsonb;
  parent_user_id uuid;
BEGIN
  -- Get the test user ID
  SELECT id INTO parent_user_id 
  FROM public.profiles 
  WHERE email = 'narrata.ai@gmail.com';
  
  IF parent_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user not found';
  END IF;
  
  -- Load persona data from fixtures
  -- This would typically be done via application code
  -- For now, we'll create the structure
  
  -- Insert P01-P10 synthetic users
  INSERT INTO public.synthetic_users (parent_user_id, profile_id, profile_name, email, profile_data) VALUES
    (parent_user_id, 'P01', 'Avery Chen', 'p01@test.narrata.ai', '{}'),
    (parent_user_id, 'P02', 'Jordan Alvarez', 'p02@test.narrata.ai', '{}'),
    (parent_user_id, 'P03', 'Riley Gupta', 'p03@test.narrata.ai', '{}'),
    (parent_user_id, 'P04', 'Morgan Patel', 'p04@test.narrata.ai', '{}'),
    (parent_user_id, 'P05', 'Samira Khan', 'p05@test.narrata.ai', '{}'),
    (parent_user_id, 'P06', 'Alex Thompson', 'p06@test.narrata.ai', '{}'),
    (parent_user_id, 'P07', 'Taylor Rodriguez', 'p07@test.narrata.ai', '{}'),
    (parent_user_id, 'P08', 'Casey Kim', 'p08@test.narrata.ai', '{}'),
    (parent_user_id, 'P09', 'Jamie Wilson', 'p09@test.narrata.ai', '{}'),
    (parent_user_id, 'P10', 'Quincy Martinez', 'p10@test.narrata.ai', '{}');
    
  -- Set P01 as active by default
  UPDATE public.synthetic_users 
  SET is_active = true 
  WHERE parent_user_id = parent_user_id AND profile_id = 'P01';
  
END;
$$ LANGUAGE plpgsql;

-- Create function to switch active synthetic user
CREATE OR REPLACE FUNCTION switch_synthetic_user(
  p_parent_user_id uuid,
  p_profile_id text
)
RETURNS void AS $$
BEGIN
  -- Deactivate all profiles for this user
  UPDATE public.synthetic_users 
  SET is_active = false 
  WHERE parent_user_id = p_parent_user_id;
  
  -- Activate the selected profile
  UPDATE public.synthetic_users 
  SET is_active = true 
  WHERE parent_user_id = p_parent_user_id AND profile_id = p_profile_id;
  
END;
$$ LANGUAGE plpgsql;
