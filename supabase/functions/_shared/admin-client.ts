/**
 * Admin Client Utility
 * 
 * Creates a Supabase client with SERVICE ROLE key that bypasses RLS.
 * ONLY use in Edge Functions with proper admin authentication.
 * NEVER expose service role key to frontend.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export function getAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for admin client');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

