/**
 * Admin Backfill Geo Edge Function
 *
 * Purpose: Populate profiles.geo (city/region/country) using IPGeolocation.
 * Usage: Admin-only; invoke with { limit, offset, dry_run }.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAdminClient } from '../_shared/admin-client.ts';
import { requireAdmin } from '../_shared/admin-guard.ts';
import { elog } from '../_shared/log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type GeoLookupResult = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

type BackfillRequest = {
  limit?: number;
  offset?: number;
  dry_run?: boolean;
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

function needsGeo(geo: Record<string, unknown> | null): boolean {
  if (!geo) return true;
  const city = geo.city;
  const region = geo.region;
  const country = geo.country;
  return !(typeof city === 'string' || typeof region === 'string' || typeof country === 'string');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const usingServiceRole = !!serviceRoleKey && !!token && token === serviceRoleKey;

    let adminUserId: string | null = null;
    if (!usingServiceRole) {
      const { isAdmin, userId, error: adminError } = await requireAdmin(authHeader);

      if (!isAdmin) {
        elog.warn('admin_backfill_geo_unauthorized', { userId, error: adminError });
        return new Response(
          JSON.stringify({ error: adminError || 'Forbidden: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      adminUserId = userId ?? null;
    }

    const { limit = 200, offset = 0, dry_run = false } = (await req.json().catch(() => ({}))) as BackfillRequest;
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const safeOffset = Math.max(offset, 0);

    const adminClient = getAdminClient();

    let scanned = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const updatedIds: string[] = [];

    const batchSize = 200;
    let page = 0;
    let pagesProcessed = 0;
    let hasMore = true;

    while (updated < safeLimit) {
      const rangeStart = safeOffset + page * batchSize;
      const rangeEnd = rangeStart + batchSize - 1;

      const { data: profiles, error: profilesError } = await adminClient
        .from('profiles')
        .select('id, email, signup_ip, geo')
        .not('signup_ip', 'is', null)
        .order('created_at', { ascending: true })
        .range(rangeStart, rangeEnd);

      if (profilesError) {
        elog.error('admin_backfill_geo_fetch_error', { error: profilesError.message });
        return new Response(
          JSON.stringify({ error: profilesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profiles || profiles.length === 0) {
        hasMore = false;
        break;
      }
      pagesProcessed += 1;

      for (const profile of profiles) {
        if (updated >= safeLimit) break;
        scanned += 1;

        const signupIp = typeof profile.signup_ip === 'string' ? profile.signup_ip : null;
        const geo = (profile.geo ?? null) as Record<string, unknown> | null;

        if (!signupIp || !needsGeo(geo)) {
          skipped += 1;
          continue;
        }

        const geoLookup = await lookupGeo(signupIp);
        if (!geoLookup) {
          skipped += 1;
          continue;
        }

        if (dry_run) {
          updated += 1;
          updatedIds.push(profile.id);
          continue;
        }

        const { error: updateError } = await adminClient
          .from('profiles')
          .update({
            geo: {
              ...(geo ?? {}),
              ip: signupIp,
              city: geoLookup.city ?? undefined,
              region: geoLookup.region ?? undefined,
              country: geoLookup.country ?? undefined,
            },
          })
          .eq('id', profile.id);

        if (updateError) {
          errors += 1;
          elog.warn('admin_backfill_geo_update_error', { userId: profile.id, error: updateError.message });
          continue;
        }

        updated += 1;
        updatedIds.push(profile.id);
      }

      if (profiles.length < batchSize) {
        hasMore = false;
        break;
      }

      page += 1;
    }

    elog.info('admin_backfill_geo_complete', {
      adminUserId: usingServiceRole ? null : adminUserId,
      scanned,
      updated,
      skipped,
      errors,
      dry_run,
    });

    return new Response(
      JSON.stringify({
        scanned,
        updated,
        skipped,
        errors,
        dry_run,
        limit: safeLimit,
        offset: safeOffset,
        updated_ids: updatedIds,
        next_offset: hasMore ? safeOffset + pagesProcessed * batchSize : null,
        has_more: hasMore,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    elog.error('admin_backfill_geo_unexpected_error', { error: message });
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
