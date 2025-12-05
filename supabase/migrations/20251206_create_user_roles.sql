-- Migration: Admin Role System
-- Purpose: Enable admin-only access to global dashboards and tools

-- ============================================================================
-- 1. User Roles Table
-- ============================================================================

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read/write roles
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can read their own role
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. Helper Function: Check if user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- If no user_id provided, check current user
  IF check_user_id IS NULL THEN
    check_user_id := auth.uid();
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Indexes
-- ============================================================================

CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_user_roles_created_at ON user_roles(created_at DESC);

-- ============================================================================
-- 5. Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Stores user role assignments (user, admin, viewer). Used for admin tool access control.';
COMMENT ON FUNCTION is_admin IS 'Returns true if the specified user (or current user) has admin role.';

-- ============================================================================
-- 6. Seed Data (REPLACE WITH YOUR USER ID)
-- ============================================================================

-- TODO: After migration, run this manually with your user_id:
-- INSERT INTO user_roles (user_id, role, created_by) 
-- VALUES ('<YOUR_USER_ID>', 'admin', '<YOUR_USER_ID>');

-- Or use this helper to make yourself admin (run after migration):
-- SELECT * FROM auth.users WHERE email = 'your-email@example.com'; -- Get your user_id
-- INSERT INTO user_roles (user_id, role) VALUES ('<user_id_from_above>', 'admin');

