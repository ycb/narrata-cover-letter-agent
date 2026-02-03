/**
 * Admin Funnel Stage Users Edge Function
 *
 * Purpose: Returns a list of users who reached a specific funnel stage with metadata.
 * Used by: /admin/funnel dashboard for the stage detail view.
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
      elog.warn('admin_funnel_stage_users_unauthorized', { userId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    elog.info('admin_funnel_stage_users_start', { adminUserId: userId });

    const { stage = 'account_created', limit = 100 } = await req.json().catch(() => ({}));

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .rpc('get_users_by_funnel_stage', { target_stage: stage, limit_rows: limit });

    if (error) {
      elog.error('admin_funnel_stage_users_error', { error: error.message });
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    elog.info('admin_funnel_stage_users_success', {
      adminUserId: userId,
      stage,
      count: data?.length || 0,
    });

    return new Response(
      JSON.stringify({ data, stage, limit }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_funnel_stage_users_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
