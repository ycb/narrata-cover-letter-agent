/**
 * Admin Evaluation Dashboard Query Edge Function
 * 
 * Purpose: Returns global evaluation_runs + sources data for admin dashboard
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
      elog.warn('admin_evaluation_dashboard_unauthorized', { userId, error: adminError });
      return new Response(
        JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    elog.info('admin_evaluation_dashboard_start', { adminUserId: userId });
    
    // Parse request
    const { userTypeFilter, userId: filterUserId } = await req.json().catch(() => ({}));
    
    elog.info('admin_evaluation_dashboard_filters', { userTypeFilter, filterUserId });
    
    // Query with service role (bypasses RLS)
    const adminClient = getAdminClient();
    
    // Fetch evaluation runs
    let runsQuery = adminClient
      .from('evaluation_runs')
      .select('*')
      .order('created_at', { ascending: false });
    
    elog.info('admin_evaluation_dashboard_query_before_filters', { 
      filterUserId, 
      userTypeFilter,
      willFilterByUser: !!(filterUserId && filterUserId !== 'all'),
      willFilterByType: !!(userTypeFilter && userTypeFilter !== 'all')
    });
    
    // Filter by specific user if provided
    if (filterUserId && filterUserId !== 'all') {
      elog.info('admin_evaluation_dashboard_filtering_by_user', { filterUserId });
      runsQuery = runsQuery.eq('user_id', filterUserId);
    }
    
    // Filter by user type (only if explicitly set and not 'all')
    if (userTypeFilter && userTypeFilter !== 'all') {
      elog.info('admin_evaluation_dashboard_filtering_by_type', { userTypeFilter });
      runsQuery = runsQuery.eq('user_type', userTypeFilter);
    }
    
    const { data: runs, error: runsError } = await runsQuery;
    
    elog.info('admin_evaluation_dashboard_query_result', { 
      runsCount: runs?.length || 0,
      hasError: !!runsError,
      errorMessage: runsError?.message 
    });
    
    if (runsError) {
      elog.error('admin_evaluation_dashboard_runs_error', { error: runsError.message });
      return new Response(
        JSON.stringify({ error: runsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fetch corresponding sources
    let sources = [];
    if (runs && runs.length > 0) {
      const sourceIds = runs
        .map((run: any) => run.source_id)
        .filter((id): id is string => Boolean(id));
      
      if (sourceIds.length > 0) {
        const { data: sourcesData, error: sourcesError } = await adminClient
          .from('sources')
          .select('id, file_name, file_type, raw_text, structured_data, created_at, storage_path')
          .in('id', sourceIds);
        
        if (sourcesError) {
          elog.error('admin_evaluation_dashboard_sources_error', { error: sourcesError.message });
          // Don't fail the request, just log and continue
        } else {
          sources = sourcesData || [];
        }
      }
    }
    
    elog.info('admin_evaluation_dashboard_success', { 
      adminUserId: userId, 
      runsCount: runs?.length || 0,
      sourcesCount: sources.length,
      userTypeFilter
    });
    
    return new Response(
      JSON.stringify({ 
        evaluationRuns: runs || [], 
        sources,
        count: runs?.length || 0 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    elog.error('admin_evaluation_dashboard_unexpected_error', { error: error.message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

