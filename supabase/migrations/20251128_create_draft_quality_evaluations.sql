-- W10: Draft Readiness Metric Storage
-- Creates draft_quality_evaluations table with TTL and RLS (select via ownership of cover_letters)

create table if not exists public.draft_quality_evaluations (
  draft_id uuid primary key references public.cover_letters(id) on delete cascade,
  rating text not null check (rating in ('weak','adequate','strong','exceptional')),
  score_breakdown jsonb not null default '{}'::jsonb,
  feedback_summary text,
  improvements jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default now(),
  ttl_expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_draft_quality_evals_ttl on public.draft_quality_evaluations(ttl_expires_at);

-- Enable RLS
alter table public.draft_quality_evaluations enable row level security;

-- SELECT policy: users can view readiness for their own drafts
create policy "Users can view readiness for own drafts"
  on public.draft_quality_evaluations for select
  using (
    exists (
      select 1
      from public.cover_letters cl
      where cl.id = draft_id
        and cl.user_id = auth.uid()
    )
  );

comment on table public.draft_quality_evaluations is 'Post-draft readiness evaluations (verdict + breakdown + feedback) with TTL caching.';


