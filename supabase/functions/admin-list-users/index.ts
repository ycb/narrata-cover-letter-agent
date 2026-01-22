/**
 * Admin List Users Edge Function
 * 
 * Purpose: Returns list of users with emails for admin UI dropdowns
 * Used by: UserSpoofSelector component
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAdminClient } from '../_shared/admin-client.ts';
import { requireAdmin } from '../_shared/admin-guard.ts';
import { elog } from '../_shared/log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserListItem {
  id: string;
  email: string;
  created_at: string;
  is_flagged?: boolean;
  flag_reason?: string | null;
  flagged_at?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    const { isAdmin, userId, error: adminError } = await requireAdmin(authHeader);
    
    if (!isAdmin) {
      elog.warn('admin_list_users_unauthorized', { userId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_list_users_start', { adminUserId: userId });
    
    // Parse request
    const { limit = 100 } = await req.json().catch(() => ({}));
    
    // Query users with service role (bypasses RLS)
    const adminClient = getAdminClient();
    
    // Get users from auth.users (only service role can access this)
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: Math.min(limit, 1000), // Cap at 1000
    });
    
    if (usersError) {
      elog.error('admin_list_users_error', { error: usersError.message });
      return new Response(
        JSON.stringify({ error: usersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userIds = users.map((user) => user.id);
    const { data: profileRows } = await adminClient
      .from('profiles')
      .select('id, is_flagged, flag_reason, flagged_at')
      .in('id', userIds);

    const profileMap = new Map(
      (profileRows || []).map((profile) => [profile.id, profile])
    );

    // Format user list
    const userList: UserListItem[] = users.map(user => ({
      id: user.id,
      email: user.email || `User ${user.id.slice(0, 8)}`,
      created_at: user.created_at,
      is_flagged: Boolean(profileMap.get(user.id)?.is_flagged),
      flag_reason: profileMap.get(user.id)?.flag_reason ?? null,
      flagged_at: profileMap.get(user.id)?.flagged_at ?? null,
    }));
    
    // Sort by created_at descending (newest first)
    userList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    elog.info('admin_list_users_success', { 
      adminUserId: userId, 
      count: userList.length 
    });
    
    return new Response(
      JSON.stringify({ users: userList, count: userList.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_list_users_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
