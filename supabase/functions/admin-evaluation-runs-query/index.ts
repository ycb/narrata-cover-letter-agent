/**
 * Admin Evaluation Runs Query Edge Function
 * 
 * Purpose: Returns global evaluation_runs data for all users (admin-only)
 * Used by: /admin/evaluation-dashboard
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
      elog.warn('admin_evaluation_runs_query_unauthorized', { userId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_evaluation_runs_query_start', { adminUserId: userId });
    
    // Parse request
    const { filters = {} } = await req.json().catch(() => ({}));
    const {
      since = '7d',
      llm_call_type = null,
      user_id = null,
      limit = 1000,
    } = filters;
    
    // Calculate date threshold
    const sinceDate = new Date();
    if (since === '7d') {
      sinceDate.setDate(sinceDate.getDate() - 7);
    } else if (since === '30d') {
      sinceDate.setDate(sinceDate.getDate() - 30);
    } else if (since === '90d') {
      sinceDate.setDate(sinceDate.getDate() - 90);
    } else {
      sinceDate.setDate(sinceDate.getDate() - 7);
    }
    
    // Query with service role (bypasses RLS)
    const adminClient = getAdminClient();
    let query = adminClient
      .from('evaluation_runs')
      .select('*')
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
    
    // Apply filters
    if (llm_call_type) {
      query = query.eq('llm_call_type', llm_call_type);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    const { data, error: queryError } = await query;
    
    if (queryError) {
      elog.error('admin_evaluation_runs_query_error', { error: queryError.message });
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_evaluation_runs_query_success', { 
      adminUserId: userId, 
      count: data?.length || 0,
      filters: { since, llm_call_type, user_id, limit }
    });
    
    return new Response(
      JSON.stringify({ data, count: data?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_evaluation_runs_query_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

