import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type DemoMappingRow = {
  slug: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  logo_url: string | null;
};

type WorkItemRow = {
  id: string;
  company_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  achievements: string[];
  tags: string[];
};

type StoryRow = {
  id: string;
  work_item_id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'approved' | 'needs-review';
};

type StreamStage = {
  status?: string;
  data?: any;
  completedAt?: string;
};

export default function Demo(props: { slugOverride?: string } = {}) {
  const { slug } = useParams();
  const resolvedSlug = props.slugOverride || slug || null;
  const [demoUserId, setDemoUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [jdCompany, setJdCompany] = useState('');
  const [jdRole, setJdRole] = useState('');
  const [jdText, setJdText] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [stages, setStages] = useState<Record<string, StreamStage>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || '';

  const companiesById = useMemo(() => {
    return new Map(companies.map((c) => [c.id, c]));
  }, [companies]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        if (!resolvedSlug) {
          throw new Error('Missing demo slug');
        }

        const { data: mapping, error: mappingError } = await supabase
          .from('public_demo_profiles')
          .select('slug, user_id')
          .eq('slug', resolvedSlug)
          .single();

        if (mappingError || !mapping) {
          throw new Error('Demo not found');
        }

        if (!isMounted) return;
        setDemoUserId((mapping as DemoMappingRow).user_id);

        const demoUserId = (mapping as DemoMappingRow).user_id;

        const [{ data: profileRow, error: profileError }, companiesRes, workItemsRes, storiesRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', demoUserId).single(),
          supabase.from('companies').select('id, name, description, tags, logo_url').eq('user_id', demoUserId),
          supabase
            .from('work_items')
            .select('id, company_id, title, start_date, end_date, description, achievements, tags')
            .eq('user_id', demoUserId)
            .order('start_date', { ascending: false }),
          supabase
            .from('stories')
            .select('id, work_item_id, title, content, tags, status')
            .eq('user_id', demoUserId)
            .in('status', ['approved', 'draft'])
            .order('created_at', { ascending: false }),
        ]);

        if (profileError) throw profileError;
        if (companiesRes.error) throw companiesRes.error;
        if (workItemsRes.error) throw workItemsRes.error;
        if (storiesRes.error) throw storiesRes.error;

        if (!isMounted) return;
        setProfile(profileRow as unknown as ProfileRow);
        setCompanies((companiesRes.data ?? []) as unknown as CompanyRow[]);
        setWorkItems((workItemsRes.data ?? []) as unknown as WorkItemRow[]);
        setStories((storiesRes.data ?? []) as unknown as StoryRow[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load demo';
        if (!isMounted) return;
        setLoadError(message);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [resolvedSlug]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  const startStream = (jobId: string) => {
    eventSourceRef.current?.close();
    setStages({});
    setStreamError(null);
    setJobId(jobId);
    setIsStreaming(true);

    const url = `${supabaseUrl}/functions/v1/demo-stream-job?jobId=${encodeURIComponent(jobId)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('progress', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        const stageName = payload?.stage;
        if (!stageName) return;
        setStages((prev) => {
          const existing = prev[stageName] ?? {};
          const mergedData = { ...(existing.data ?? {}), ...(payload.data ?? {}) };
          const nextStatus = payload.isPartial ? 'running' : 'complete';
          return {
            ...prev,
            [stageName]: {
              status: nextStatus,
              data: mergedData,
              completedAt: payload.isPartial ? existing.completedAt : payload.timestamp,
            },
          };
        });
      } catch (e) {
        // non-blocking
      }
    });

    es.addEventListener('complete', () => {
      setIsStreaming(false);
      es.close();
      eventSourceRef.current = null;
    });

    es.addEventListener('error', (evt) => {
      try {
        // Some environments send "error" without payload; keep it user-friendly.
        const maybeData = (evt as MessageEvent).data;
        const payload = typeof maybeData === 'string' ? JSON.parse(maybeData) : null;
        setStreamError(payload?.error || 'Stream error');
      } catch {
        setStreamError('Stream error');
      } finally {
        setIsStreaming(false);
        es.close();
        eventSourceRef.current = null;
      }
    });
  };

  const runDemo = async () => {
    setStreamError(null);

    if (!resolvedSlug) {
      setStreamError('Missing demo slug');
      return;
    }

    const content = jdText.trim();
    const company = jdCompany.trim();
    const role = jdRole.trim();

    if (content.length < 50) {
      setStreamError('Paste a longer job description (50+ characters).');
      return;
    }
    if (!company || !role) {
      setStreamError('Add company and role title.');
      return;
    }

    const { data, error } = await supabase.functions.invoke<{
      jobId: string;
      jobDescriptionId: string;
    }>('demo-create-job', {
      body: {
        demoSlug: resolvedSlug,
        jobDescription: { content, company, role },
      },
    });

    if (error || !data?.jobId) {
      setStreamError(error?.message || 'Failed to start demo');
      return;
    }

    startStream(data.jobId);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="text-sm text-muted-foreground">Loading demo…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="text-sm text-red-600">{loadError}</div>
        <div className="mt-4 text-sm">
          <Link to="/" className="underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const name = profile?.full_name || 'Demo';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Public demo (read-only)</div>
          <h1 className="mt-2 text-3xl font-semibold">{name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            Paste a job description to see fit analysis against this profile. To save/edit your own,{' '}
            <Link to="/signup" className="underline">
              create an account
            </Link>
            .
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>{workItems.length} roles</div>
          <div>{stories.length} stories</div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-5">
          <div className="text-sm font-medium">Try it: Paste a JD</div>
          <div className="mt-4 grid gap-3">
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm"
              placeholder="Company"
              value={jdCompany}
              onChange={(e) => setJdCompany(e.target.value)}
            />
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm"
              placeholder="Role title"
              value={jdRole}
              onChange={(e) => setJdRole(e.target.value)}
            />
            <textarea
              className="min-h-[220px] resize-y rounded-md border bg-background p-3 text-sm"
              placeholder="Paste job description…"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
            <button
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
              onClick={runDemo}
              disabled={isStreaming}
            >
              {isStreaming ? 'Analyzing…' : 'Analyze fit'}
            </button>
            {streamError && <div className="text-sm text-red-600">{streamError}</div>}
            {jobId && (
              <div className="text-xs text-muted-foreground">
                Job: <span className="font-mono">{jobId}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="text-sm font-medium">Results (live)</div>
          {Object.keys(stages).length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              No results yet. Paste a job description and click “Analyze fit”.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {Object.entries(stages).map(([stageName, stage]) => (
                <div key={stageName} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{stageName}</div>
                    <div className="text-xs text-muted-foreground">{stage.status || 'pending'}</div>
                  </div>
                  <pre className="mt-2 max-h-56 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(stage.data ?? {}, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-background p-5">
          <div className="text-sm font-medium">Work history</div>
          <div className="mt-4 space-y-3">
            {workItems.map((wi) => {
              const company = companiesById.get(wi.company_id);
              return (
                <div key={wi.id} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">
                    {wi.title}
                    {company ? <span className="text-muted-foreground"> · {company.name}</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {wi.start_date}
                    {wi.end_date ? ` → ${wi.end_date}` : ' → Present'}
                  </div>
                  {wi.description ? <div className="mt-2 text-sm">{wi.description}</div> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="text-sm font-medium">Stories</div>
          <div className="mt-4 space-y-3">
            {stories.slice(0, 8).map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.status}</div>
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">{s.content}</div>
              </div>
            ))}
            {stories.length > 8 ? (
              <div className="text-xs text-muted-foreground">Showing 8 of {stories.length} stories.</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-10 text-xs text-muted-foreground">
        Demo traffic is monitored (LogRocket/Pendo). Please don’t paste sensitive or proprietary information.
      </div>
    </div>
  );
}
