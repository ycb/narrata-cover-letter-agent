create table if not exists public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  normalized_tag text not null,
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_tags_category_check
    check (category in ('company', 'role', 'story', 'saved_section', 'link'))
);

create unique index if not exists user_tags_user_id_normalized_tag_category_idx
  on public.user_tags (user_id, normalized_tag, category);

create index if not exists user_tags_user_id_category_idx
  on public.user_tags (user_id, category);

alter table public.user_tags enable row level security;

create policy "Users manage their tags"
  on public.user_tags
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
