/**
 * Admin Set User Flag Edge Function
 *
 * Purpose: Flag/unflag a user account for manual review.
 * Used by: Admin UI (UserSpoofSelector).
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const { isAdmin, userId, error: adminError } = await requireAdmin(authHeader);

    if (!isAdmin) {
      elog.warn('admin_set_user_flag_unauthorized', { userId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.user_id;
    const isFlagged = Boolean(body?.is_flagged);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : null;

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getAdminClient();
    const payload = {
      is_flagged: isFlagged,
      flag_reason: isFlagged ? (reason || null) : null,
      flagged_at: isFlagged ? new Date().toISOString() : null,
      flagged_by: isFlagged ? userId : null,
    };

    const { data, error } = await adminClient
      .from('profiles')
      .update(payload)
      .eq('id', targetUserId)
      .select('id, is_flagged, flag_reason, flagged_at, flagged_by')
      .single();

    if (error) {
      elog.error('admin_set_user_flag_error', { error: error.message, targetUserId });
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    elog.info('admin_set_user_flag_success', {
      adminUserId: userId,
      targetUserId,
      isFlagged,
    });

    return new Response(
      JSON.stringify({ user: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_set_user_flag_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
