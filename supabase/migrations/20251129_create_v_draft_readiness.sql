-- Readiness QA view (non-breaking; safe to run multiple times)
create or replace view public.v_draft_readiness as
select
  dre.draft_id,
  dre.rating,
  case dre.rating
    when 'weak' then 1
    when 'adequate' then 2
    when 'strong' then 3
    when 'exceptional' then 4
  end as rating_score,
  dre.evaluated_at,
  dre.ttl_expires_at,
  (now() at time zone 'utc' < dre.ttl_expires_at) as is_fresh,
  cl.user_id,
  cl.updated_at as draft_updated_at
from public.draft_quality_evaluations dre
join public.cover_letters cl on cl.id = dre.draft_id;

-- Helpful indexes if used heavily in dashboards
create index if not exists idx_v_draft_readiness_evaluated_at on public.draft_quality_evaluations (evaluated_at desc);
create index if not exists idx_v_draft_readiness_rating on public.draft_quality_evaluations (rating);


