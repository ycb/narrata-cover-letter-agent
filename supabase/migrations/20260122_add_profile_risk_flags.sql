alter table public.profiles
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists flagged_at timestamptz,
  add column if not exists flagged_by uuid references auth.users(id);

create index if not exists idx_profiles_is_flagged
  on public.profiles (is_flagged);

comment on column public.profiles.is_flagged is 'Admin flag indicating account is under review.';
comment on column public.profiles.flag_reason is 'Admin note explaining why the account is flagged.';
comment on column public.profiles.flagged_at is 'Timestamp when the account was flagged.';
comment on column public.profiles.flagged_by is 'Admin user who flagged the account.';
