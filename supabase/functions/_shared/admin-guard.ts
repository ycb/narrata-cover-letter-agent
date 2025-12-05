/**
 * Admin Guard Utility
 * 
 * Verifies that the authenticated user has admin role.
 * Used in Edge Functions to protect admin-only endpoints.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export interface AdminCheckResult {
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}

export async function requireAdmin(authHeader: string | null): Promise<AdminCheckResult> {
  if (!authHeader) {
    return { 
      isAdmin: false, 
      userId: null, 
      error: 'Missing authorization header' 
    };
  }
  
  // Create client with user's auth token
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!supabaseUrl || !anonKey) {
    return { 
      isAdmin: false, 
      userId: null, 
      error: 'Server configuration error' 
    };
  }
  
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Get authenticated user
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  
  if (authError || !user) {
    return { 
      isAdmin: false, 
      userId: null, 
      error: 'Invalid or expired auth token' 
    };
  }
  
  // Check if user has admin role
  const { data: roleData, error: roleError } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  if (roleError) {
    // User has no role assigned
    return { 
      isAdmin: false, 
      userId: user.id, 
      error: 'No role assigned to user' 
    };
  }
  
  if (!roleData) {
    return { 
      isAdmin: false, 
      userId: user.id, 
      error: 'Role not found' 
    };
  }
  
  return {
    isAdmin: roleData.role === 'admin',
    userId: user.id,
    error: roleData.role !== 'admin' ? 'User is not an admin' : undefined,
  };
}

