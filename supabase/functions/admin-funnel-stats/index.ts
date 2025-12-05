/**
 * Admin Funnel Stats Edge Function
 * 
 * Purpose: Returns user progression funnel analytics (admin-only)
 * Used by: /admin/funnel dashboard
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
    const { isAdmin, userId, error: adminError } = await requireAdmin(authHeader);
    
    if (!isAdmin) {
      elog.warn('admin_funnel_stats_unauthorized', { userId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_funnel_stats_start', { adminUserId: userId });
    
    // Parse request
    const { since = '30d' } = await req.json().catch(() => ({}));
    
    // Calculate date threshold
    const sinceDate = new Date();
    if (since === '7d') {
      sinceDate.setDate(sinceDate.getDate() - 7);
    } else if (since === '30d') {
      sinceDate.setDate(sinceDate.getDate() - 30);
    } else if (since === '90d') {
      sinceDate.setDate(sinceDate.getDate() - 90);
    } else {
      sinceDate.setDate(sinceDate.getDate() - 30);
    }
    
    // Call funnel stats function
    const adminClient = getAdminClient();
    const { data, error: queryError } = await adminClient
      .rpc('get_funnel_stats', { since_date: sinceDate.toISOString() });
    
    if (queryError) {
      elog.error('admin_funnel_stats_error', { error: queryError.message });
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_funnel_stats_success', { 
      adminUserId: userId, 
      stageCount: data?.length || 0,
      since
    });
    
    return new Response(
      JSON.stringify({ data, since, generated_at: new Date().toISOString() }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_funnel_stats_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

