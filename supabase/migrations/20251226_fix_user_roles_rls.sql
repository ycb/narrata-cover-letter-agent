-- Fix: Infinite Recursion in user_roles RLS Policy
-- 
-- Problem: The "Admins can manage all roles" policy checks user_roles to see if user is admin,
--          which creates infinite recursion when trying to read user_roles.
--
-- Solution: Drop the recursive admin policy and use SECURITY DEFINER function instead.

-- ============================================================================
-- 1. Drop the problematic policy
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- ============================================================================
-- 2. Simplified policies: Users can only read their own role
-- ============================================================================

-- Policy: Users can read their own role (no recursion)
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Note: For admin operations (insert/update/delete), use Edge Functions with service role
-- This avoids RLS recursion entirely since service role bypasses RLS

-- ============================================================================
-- 3. Comments
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Admin role assignments. Users can read their own role via RLS. Admins modify roles via Edge Functions with service role (bypasses RLS).';

