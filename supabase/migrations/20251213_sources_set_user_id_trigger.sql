-- Ensure inserts to sources automatically set user_id to the authenticated user
-- Safe to run repeatedly

create or replace function public.set_user_id_from_auth()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_set_user_id_on_sources'
  ) then
    create trigger trg_set_user_id_on_sources
    before insert on public.sources
    for each row
    execute function public.set_user_id_from_auth();
  end if;
end $$;


