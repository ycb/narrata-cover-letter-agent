import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { CoverLetterDraftService, DraftReadinessFeatureDisabledError } from '@/services/coverLetterDraftService';
import { isDraftReadinessEnabled } from '@/lib/flags';

type NextApiRequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[]>;
};

type NextApiResponseLike = {
  status: (code: number) => NextApiResponseLike;
  json: (body: any) => void;
  setHeader: (name: string, value: string) => void;
  end?: () => void;
};

const getEnv = (key: string): string | undefined =>
  process.env[key] ?? process.env[`VITE_${key}`];

const requiredEnv = (key: string): string => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

const createSupabaseAdminClient = (): SupabaseClient<Database> => {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
  });
};

const createSupabaseUserClient = (accessToken: string): SupabaseClient<Database> => {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const parseDraftId = (query: Record<string, string | string[]>): string | null => {
  const raw = query.draftId ?? query.id;
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null;
};

const parseAuthorizationHeader = (
  headers: Record<string, string | string[] | undefined>,
): string | null => {
  const header =
    headers.authorization ??
    headers.Authorization ??
    (Array.isArray(headers['Authorization']) ? headers['Authorization'][0] : undefined);
  if (typeof header !== 'string') return null;
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return null;
  }
  return parts[1];
};

const handleMethodNotAllowed = (res: NextApiResponseLike) => {
  res.setHeader('Allow', 'GET');
  res.status(405).json({ error: 'method_not_allowed' });
};

const readinessHandler = async (req: NextApiRequestLike, res: NextApiResponseLike) => {
  if (req.method !== 'GET') {
    return handleMethodNotAllowed(res);
  }

  if (!isDraftReadinessEnabled()) {
    return res.status(503).json({ error: 'disabled' });
  }

  const draftId = parseDraftId(req.query);
  if (!draftId) {
    return res.status(400).json({ error: 'missing_draft_id' });
  }

  const accessToken = parseAuthorizationHeader(req.headers);
  if (!accessToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const { data: userResult, error: userError } = await adminClient.auth.getUser(accessToken);
    if (userError || !userResult?.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const userId = userResult.user.id;

    const { data: draftRow, error: draftError } = await adminClient
      .from('cover_letters')
      .select('id, user_id')
      .eq('id', draftId)
      .maybeSingle();

    if (draftError) {
      console.error('[draft-readiness] Failed to load draft ownership', draftError);
      return res.status(500).json({ error: 'internal_error' });
    }

    if (!draftRow) {
      return res.status(404).json({ error: 'not_found' });
    }

    if (draftRow.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const supabaseUserClient = createSupabaseUserClient(accessToken);
    const service = new CoverLetterDraftService({ supabaseClient: supabaseUserClient });

    let readiness;
    try {
      readiness = await service.getReadinessEvaluation(draftId);
    } catch (serviceErr) {
      if (serviceErr instanceof DraftReadinessFeatureDisabledError) {
        return res.status(503).json({ error: 'disabled' });
      }
      throw serviceErr;
    }

    if (!readiness) {
      if (typeof res.end === 'function') {
        res.status(204).end();
      } else {
        res.status(204).json(null);
      }
      return;
    }

    return res.status(200).json({
      rating: readiness.rating,
      scoreBreakdown: readiness.scoreBreakdown,
      feedback: readiness.feedback,
      evaluatedAt: readiness.evaluatedAt ?? null,
      ttlExpiresAt: readiness.ttlExpiresAt ?? null,
      fromCache: Boolean(readiness.fromCache),
    });
  } catch (error) {
    console.error('[draft-readiness] Unexpected error', error);
    return res.status(500).json({ error: 'internal_error' });
  }
};

export default readinessHandler;


