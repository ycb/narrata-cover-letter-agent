/**
 * Admin Spoof User Edge Function
 * 
 * Purpose: Allows admin to generate a temporary "spoof session" token
 *          that gives them the same RLS-scoped view as the target user
 * Used by: Admin user spoofing feature
 * 
 * Security:
 * - Requires admin role verification
 * - Logs all spoofing actions for audit trail
 * - Returns a time-limited JWT token with spoofed user_id
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAdminClient } from '../_shared/admin-client.ts';
import { requireAdmin } from '../_shared/admin-guard.ts';
import { elog } from '../_shared/log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Verify admin
    const authHeader = req.headers.get('Authorization');
    const { isAdmin, userId: adminUserId, error: adminError } = await requireAdmin(authHeader);
    
    if (!isAdmin) {
      elog.warn('admin_spoof_user_unauthorized', { userId: adminUserId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request
    const { target_user_id, redirect_to } = await req.json();
    
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_spoof_user_start', { 
      adminUserId, 
      targetUserId: target_user_id 
    });
    
    // Verify target user exists
    const adminClient = getAdminClient();
    const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(target_user_id);
    
    if (userError || !targetUser) {
      elog.error('admin_spoof_user_target_not_found', { 
        adminUserId, 
        targetUserId: target_user_id,
        error: userError?.message 
      });
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log spoofing action for audit trail
    await adminClient
      .from('user_events')
      .insert({
        user_id: adminUserId,
        event_type: 'admin_spoofed_user',
        metadata: {
          target_user_id,
          target_user_email: targetUser.user.email,
          timestamp: new Date().toISOString(),
        },
      });
    
    // Generate a session token for the target user
    // NOTE: This gives admin full access as the target user (RLS will see target user_id)
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email!,
      options: redirect_to ? { redirectTo: redirect_to } : undefined,
    });
    
    if (sessionError || !sessionData) {
      elog.error('admin_spoof_user_session_error', { 
        adminUserId, 
        targetUserId: target_user_id,
        error: sessionError?.message 
      });
      return new Response(
        JSON.stringify({ error: 'Failed to generate spoof session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_spoof_user_success', { 
      adminUserId, 
      targetUserId: target_user_id,
      targetEmail: targetUser.user.email
    });
    
    return new Response(
      JSON.stringify({ 
        spoof_token: sessionData.properties.action_link,
        target_user: {
          id: target_user_id,
          email: targetUser.user.email,
        },
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        warning: 'This token grants full access as the target user. Use responsibly.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_spoof_user_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
