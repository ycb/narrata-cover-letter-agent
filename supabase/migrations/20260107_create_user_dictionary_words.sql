create table if not exists public.user_dictionary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists user_dictionary_words_user_id_word_idx
  on public.user_dictionary_words (user_id, word);

alter table public.user_dictionary_words enable row level security;

create policy "Users manage their dictionary words"
  on public.user_dictionary_words
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
