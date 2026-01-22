create table if not exists public.deleted_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_table text not null,
  source_id text not null,
  source_data jsonb not null,
  deleted_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '90 days'),
  deleted_by uuid references auth.users(id)
);

create index if not exists idx_deleted_records_user_id
  on public.deleted_records (user_id);

create index if not exists idx_deleted_records_purge_after
  on public.deleted_records (purge_after);

create index if not exists idx_deleted_records_source
  on public.deleted_records (source_table, source_id);

alter table public.deleted_records enable row level security;

drop policy if exists "Users manage their deleted records" on public.deleted_records;
create policy "Users manage their deleted records"
  on public.deleted_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.purge_deleted_records()
returns integer
language plpgsql
as $$
declare
  deleted_count integer;
begin
  delete from public.deleted_records
  where purge_after < now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on table public.deleted_records is 'Archived copies of deleted rows retained for a limited window.';
comment on column public.deleted_records.source_table is 'Originating table name for the deleted row.';
comment on column public.deleted_records.source_id is 'Originating row id (stored as text to support multiple id types).';
comment on column public.deleted_records.source_data is 'Snapshot of the deleted row payload.';
comment on column public.deleted_records.deleted_at is 'Timestamp when the row was archived.';
comment on column public.deleted_records.purge_after is 'Timestamp after which the archived row can be purged.';
comment on function public.purge_deleted_records is 'Permanently removes archived deleted records after purge_after.';
