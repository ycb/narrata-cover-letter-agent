/**
 * Capture Login IP/Geo
 *
 * Purpose: On authenticated login, capture IP/geo if it differs from stored signup IP.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GeoLookupResult = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

const extractIp = (headers: Headers): string | null => {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  return realIp && realIp.trim() ? realIp.trim() : null;
};

async function lookupGeo(ip: string): Promise<GeoLookupResult | null> {
  const apiKey = Deno.env.get('IPGEO_API_KEY') ?? Deno.env.get('VITE_IPGEO');
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = new URL('https://api.ipgeolocation.io/ipgeo');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('ip', ip);

    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as Record<string, unknown>;
    const city = typeof data.city === 'string' ? data.city : null;
    const region = typeof data.state_prov === 'string' ? data.state_prov : null;
    const country = typeof data.country_name === 'string' ? data.country_name : null;

    if (!city && !region && !country) return null;
    return { city, region, country };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Supabase environment variables missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signupIp = extractIp(req.headers);
    if (!signupIp) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_ip' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const internalEmails = new Set([
      'peter.spannagle@gmail.com',
      'narrata.ai@gmail.com',
      'darionovoa@ideartte.com',
    ]);
    const blockedIps = new Set(['64.62.226.203']);
    const isInternal = typeof user.email === 'string' && internalEmails.has(user.email.toLowerCase());
    const effectiveIp = blockedIps.has(signupIp) && !isInternal ? null : signupIp;

    if (!effectiveIp) {
      return new Response(JSON.stringify({ skipped: true, reason: 'blocked_ip' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, signup_ip, last_login_ip, geo')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storedIp =
      (profile?.signup_ip as string | null) ??
      (profile?.last_login_ip as string | null) ??
      ((profile?.geo as Record<string, unknown> | null)?.ip as string | null) ??
      null;

    if (storedIp === effectiveIp) {
      return new Response(JSON.stringify({ skipped: true, reason: 'ip_unchanged' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geoLookup = await lookupGeo(effectiveIp);
    const existingGeo = (profile?.geo ?? null) as Record<string, unknown> | null;

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        last_login_ip: effectiveIp,
        last_login_at: new Date().toISOString(),
        geo: geoLookup
          ? {
              ...(existingGeo ?? {}),
              ip: effectiveIp,
              city: geoLookup.city ?? undefined,
              region: geoLookup.region ?? undefined,
              country: geoLookup.country ?? undefined,
            }
          : existingGeo,
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ updated: true, ip: effectiveIp }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
