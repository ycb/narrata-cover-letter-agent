import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SIGNUP_ALERT_TO_EMAIL = (Deno.env.get('SIGNUP_ALERT_TO_EMAIL') ?? 'peter@narrata.co').trim();
if (!SIGNUP_ALERT_TO_EMAIL.includes('@')) {
  throw new Error('SIGNUP_ALERT_TO_EMAIL must be a valid email address');
}

const rawFrom = (
  Deno.env.get('SIGNUP_ALERT_FROM_EMAIL') ??
  Deno.env.get('SUPPORT_FROM_EMAIL') ??
  'Narrata <support@narrata.co>'
).trim();
const SIGNUP_ALERT_FROM_EMAIL = /<[^>]+>/.test(rawFrom)
  ? rawFrom
  : rawFrom.includes('@')
    ? rawFrom
    : 'support@narrata.co';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_WEBHOOK_URL = Deno.env.get('SUPPORT_EMAIL_WEBHOOK_URL');

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

interface CaptureSignupPayload {
  utm?: Record<string, string> | null;
  referrer?: string | null;
  landing_url?: string | null;
  account_type?: string | null;
}

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeUtm = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object') return null;
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const entry = (value as Record<string, unknown>)[key];
    if (typeof entry === 'string' && entry.trim()) {
      utm[key] = entry.trim();
    }
  }
  return Object.keys(utm).length ? utm : null;
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

const formatMetadata = (metadata: Record<string, unknown>): string => {
  try {
    return JSON.stringify(metadata, null, 2);
  } catch (error) {
    console.error('[capture-signup] Failed to stringify metadata:', error);
    return '{}';
  }
};

async function sendViaResend(payload: { subject: string; body: string; metadataText: string }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is required for Resend delivery');
  }

  const htmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${payload.subject}</title>
  </head>
  <body>
    <p>${payload.body.replace(/\n/g, '<br />')}</p>
    <hr />
    <p><strong>Metadata</strong></p>
    <pre style="background:#f4f4f5;padding:16px;border-radius:8px;">${payload.metadataText}</pre>
  </body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: SIGNUP_ALERT_FROM_EMAIL,
      to: [SIGNUP_ALERT_TO_EMAIL],
      subject: payload.subject,
      text: `${payload.body}\n\n---\n${payload.metadataText}`,
      html: htmlBody,
      tags: [{ name: 'tag_0', value: 'signup_alert' }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function sendViaWebhook(payload: { subject: string; body: string; metadataText: string }) {
  if (!SUPPORT_WEBHOOK_URL) {
    throw new Error('SUPPORT_EMAIL_WEBHOOK_URL environment variable is required for webhook delivery');
  }

  const response = await fetch(SUPPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: SIGNUP_ALERT_TO_EMAIL,
      from: SIGNUP_ALERT_FROM_EMAIL,
      subject: payload.subject,
      body: payload.body,
      metadata: payload.metadataText,
      tags: ['signup_alert'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Signup webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function sendSignupAlert(payload: { subject: string; body: string; metadata: Record<string, unknown> }) {
  const metadataText = formatMetadata(payload.metadata);
  if (RESEND_API_KEY) {
    await sendViaResend({ subject: payload.subject, body: payload.body, metadataText });
    return;
  }
  if (SUPPORT_WEBHOOK_URL) {
    await sendViaWebhook({ subject: payload.subject, body: payload.body, metadataText });
    return;
  }
  throw new Error('No email delivery mechanism configured. Provide RESEND_API_KEY or SUPPORT_EMAIL_WEBHOOK_URL.');
}

const buildSignupBody = (data: {
  email: string | null;
  fullName: string | null;
  userId: string;
  accountType: string | null;
  provider: string | null;
  signupIp: string | null;
  userAgent: string | null;
  referrer: string | null;
  landingUrl: string | null;
  utm: Record<string, string> | null;
  createdAt: string | null;
}): string => {
  return [
    'New Narrata signup',
    `Email: ${data.email ?? '-'}`,
    `Name: ${data.fullName ?? '-'}`,
    `User ID: ${data.userId}`,
    `Account type: ${data.accountType ?? '-'}`,
    `Provider: ${data.provider ?? '-'}`,
    `Signup IP: ${data.signupIp ?? '-'}`,
    `User agent: ${data.userAgent ?? '-'}`,
    `Referrer: ${data.referrer ?? '-'}`,
    `Landing URL: ${data.landingUrl ?? '-'}`,
    `UTM: ${data.utm ? JSON.stringify(data.utm) : '-'}`,
    `Created at: ${data.createdAt ?? '-'}`,
  ].join('\n');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token', details: authError?.message ?? 'No user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: CaptureSignupPayload = {};
    try {
      payload = (await req.json()) as CaptureSignupPayload;
    } catch {
      payload = {};
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const metadataAcquisition = (metadata.acquisition ?? {}) as Record<string, unknown>;

    const utm = normalizeUtm(payload.utm ?? metadataAcquisition.utm);
    const referrer = normalizeString(payload.referrer ?? metadataAcquisition.referrer);
    const landingUrl = normalizeString(
      payload.landing_url ?? metadataAcquisition.landing_url ?? metadataAcquisition.first_landing_url
    );
    const accountType = normalizeString(payload.account_type ?? metadata.account_type);
    const signupIp = extractIp(req.headers);
    const userAgent = normalizeString(req.headers.get('user-agent'));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, acquisition_utm, acquisition_referrer, acquisition_first_landing_url, signup_ip, signup_user_agent, signup_alert_sent_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[capture-signup] Failed to fetch profile:', profileError);
    }

    const updates: Record<string, unknown> = {};
    if (!profile?.acquisition_utm && utm) updates.acquisition_utm = utm;
    if (!profile?.acquisition_referrer && referrer) updates.acquisition_referrer = referrer;
    if (!profile?.acquisition_first_landing_url && landingUrl) {
      updates.acquisition_first_landing_url = landingUrl;
    }
    if (!profile?.signup_ip && signupIp) updates.signup_ip = signupIp;
    if (!profile?.signup_user_agent && userAgent) updates.signup_user_agent = userAgent;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        console.warn('[capture-signup] Failed to update profile:', updateError);
      }
    }

    const shouldSendAlert = !profile?.signup_alert_sent_at;
    if (shouldSendAlert) {
      const fullName =
        profile?.full_name ??
        normalizeString(metadata.full_name ?? metadata.name ?? metadata.given_name) ??
        null;

      const alertMetadata = {
        user_id: user.id,
        email: user.email ?? null,
        full_name: fullName,
        account_type: accountType,
        provider: user.app_metadata?.provider ?? null,
        signup_ip: signupIp,
        user_agent: userAgent,
        acquisition: {
          utm,
          referrer,
          landing_url: landingUrl,
        },
        created_at: user.created_at ?? null,
      };

      const body = buildSignupBody({
        email: user.email ?? null,
        fullName,
        userId: user.id,
        accountType,
        provider: user.app_metadata?.provider ?? null,
        signupIp,
        userAgent,
        referrer,
        landingUrl,
        utm,
        createdAt: user.created_at ?? null,
      });

      await sendSignupAlert({
        subject: 'New Narrata signup',
        body,
        metadata: alertMetadata,
      });

      const { error: alertUpdateError } = await supabase
        .from('profiles')
        .update({ signup_alert_sent_at: new Date().toISOString() })
        .eq('id', user.id);

      if (alertUpdateError) {
        console.warn('[capture-signup] Failed to record alert timestamp:', alertUpdateError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[capture-signup] Failure:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
