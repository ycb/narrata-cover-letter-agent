import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check environment variables
  const envCheck = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'SET' : 'MISSING',
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'MISSING',
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ? 'SET' : 'MISSING',
    authHeader: req.headers.get('Authorization') ? 'PRESENT' : 'MISSING',
  };

  return new Response(
    JSON.stringify(envCheck, null, 2),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});

