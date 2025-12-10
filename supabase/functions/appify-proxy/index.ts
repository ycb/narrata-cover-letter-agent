import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ENABLE_LI_SCRAPING = Deno.env.get('ENABLE_LI_SCRAPING') === 'true';
const APIFY_API_TOKEN = Deno.env.get('APIFY_API_TOKEN');
const APIFY_ACTOR_ID = Deno.env.get('APIFY_ACTOR_ID') || 'highvoltag3-owner~linkedin-scraper';
const APIFY_BUILD_NUMBER = '1.1.2'; // Latest build with improved experience parser
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CACHE_TTL_DAYS = 7; // Cache LinkedIn data for 7 days

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const startTime = performance.now();

  try {
    // 0. Feature flag: Return early if LinkedIn scraping is disabled
    if (!ENABLE_LI_SCRAPING) {
      console.log('[apify-proxy] LinkedIn scraping disabled by feature flag (ENABLE_LI_SCRAPING=false)');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'LinkedIn scraping disabled',
          disabled: true 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 1. Validate API token exists
    if (!APIFY_API_TOKEN) {
      console.error('[apify-proxy] Missing APIFY_API_TOKEN');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 2. Parse and validate input
    const body = await req.json();
    const linkedinUrl = body.linkedinUrl || body.linkedin_url;
    const fullName = body.fullName || body.name;
    const profileId = body.profileId;
    
    console.log('[appify-proxy] Request:', { linkedinUrl, fullName, profileId });

    if (!linkedinUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'LinkedIn URL is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Validate LinkedIn URL pattern
    const urlPattern = /linkedin\.com\/(in|pub)\/([A-Za-z0-9\-_%]+)/i;
    const match = linkedinUrl.match(urlPattern);
    
    if (!match) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid LinkedIn URL format' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Normalize LinkedIn URL (extract username)
    const normalizedUrl = `https://www.linkedin.com/in/${match[2]}`;

    // 3. Check cache (sources table with source_type='linkedin')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user_id from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[appify-proxy] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Check for cached LinkedIn data
    const cacheCheckStart = performance.now();
    const { data: cachedSource, error: cacheError } = await supabase
      .from('sources')
      .select('id, structured_data, created_at, file_name')
      .eq('user_id', user.id)
      .eq('source_type', 'linkedin')
      .like('file_name', `%${match[2]}%`) // Match by LinkedIn username
      .gte('created_at', new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const cacheCheckDuration = performance.now() - cacheCheckStart;

    if (cachedSource && !cacheError) {
      console.log('[appify-proxy] Cache HIT:', {
        sourceId: cachedSource.id,
        age: Math.round((Date.now() - new Date(cachedSource.created_at).getTime()) / 1000 / 60),
        cacheCheckDuration: `${cacheCheckDuration.toFixed(2)}ms`,
        totalDuration: `${(performance.now() - startTime).toFixed(2)}ms`
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: cachedSource.structured_data,
          cached: true,
          sourceId: cachedSource.id
        }),
        { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    console.log('[apify-proxy] Cache MISS - fetching from Apify');

    // 4. Fetch from Apify (cache miss)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (Apify can be slow)

    const apifyFetchStart = performance.now();
    
    // Build Apify Actor run input (custom linkedin-scraper format)
    const apifyInput = {
      profileUrls: [normalizedUrl]
    };

    console.log('[apify-proxy] Calling Apify Actor with:', {
      actor: APIFY_ACTOR_ID,
      url: normalizedUrl
    });

    // Start Apify Actor run and wait for completion
    const apifyResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apifyInput),
        signal: controller.signal
      }
    ).catch((err) => {
      if (err.name === 'AbortError') {
        throw new Error('Apify request timeout after 60s');
      }
      throw err;
    });

    clearTimeout(timeoutId);
    const apifyFetchDuration = performance.now() - apifyFetchStart;

    // 5. Handle non-200 responses
    if (!apifyResponse.ok) {
      const errorText = await apifyResponse.text();
      console.error('[apify-proxy] Apify error:', {
        status: apifyResponse.status,
        statusText: apifyResponse.statusText,
        error: errorText,
        duration: `${apifyFetchDuration.toFixed(2)}ms`
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Apify returned ${apifyResponse.status}: ${apifyResponse.statusText}`,
          details: errorText
        }),
        { 
          status: 200, // Return 200 with error payload for easier client handling
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // 6. Parse Apify response (array of scraped profiles)
    const apifyData = await apifyResponse.json();
    
    console.log('[apify-proxy] Apify success:', {
      duration: `${apifyFetchDuration.toFixed(2)}ms`,
      totalDuration: `${(performance.now() - startTime).toFixed(2)}ms`,
      profilesReturned: Array.isArray(apifyData) ? apifyData.length : 0
    });

    // 7. Return first profile from results (Apify returns array)
    const profile = Array.isArray(apifyData) && apifyData.length > 0 ? apifyData[0] : null;
    
    if (!profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No profile data returned from Apify'
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }
    
    // Check for Apify free plan error
    if (profile.error && profile.error.includes('free Apify plan')) {
      console.error('[apify-proxy] Apify free plan restriction:', profile.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'LinkedIn auto-population requires a paid Apify plan. Please enter LinkedIn data manually or upgrade your Apify account.'
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: profile,
        cached: false
      }),
      { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );

  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('[appify-proxy] Error:', {
      error: error.message,
      stack: error.stack,
      duration: `${duration.toFixed(2)}ms`
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
});
