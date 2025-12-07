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

/**
 * Check admin role using service role (bypasses RLS)
 * Fallback when user client query fails due to RLS issues
 */
async function checkAdminWithServiceRole(userId: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[admin-guard] Service role credentials missing');
    return false;
  }
  
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  const { data, error } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('[admin-guard] Service role query failed:', error);
    return false;
  }
  
  return data?.role === 'admin';
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
  
  // Extract token from Authorization header
  const token = authHeader.replace('Bearer ', '');
  
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Get authenticated user by token
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  
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
    // Log the actual error for debugging
    console.error('[admin-guard] Error fetching user role via user client:', {
      code: roleError.code,
      message: roleError.message,
      details: roleError.details,
      hint: roleError.hint,
      userId: user.id,
    });
    
    // Fallback: Try using service role (bypasses RLS)
    console.log('[admin-guard] Attempting fallback with service role...');
    const isAdminViaServiceRole = await checkAdminWithServiceRole(user.id);
    
    if (isAdminViaServiceRole) {
      console.log('[admin-guard] Service role check succeeded - user is admin');
      return {
        isAdmin: true,
        userId: user.id,
      };
    }
    
    // Both methods failed
    return { 
      isAdmin: false, 
      userId: user.id, 
      error: `Database error: ${roleError.message}` 
    };
  }
  
  if (!roleData) {
    console.warn('[admin-guard] No role data returned for user:', user.id);
    return { 
      isAdmin: false, 
      userId: user.id, 
      error: 'Role not found' 
    };
  }
  
  console.log('[admin-guard] User role check successful:', {
    userId: user.id,
    role: roleData.role,
    isAdmin: roleData.role === 'admin',
  });
  
  return {
    isAdmin: roleData.role === 'admin',
    userId: user.id,
    error: roleData.role !== 'admin' ? 'User is not an admin' : undefined,
  };
}

