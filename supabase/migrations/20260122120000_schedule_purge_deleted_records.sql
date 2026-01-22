create extension if not exists pg_cron with schema extensions;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'purge_deleted_records_daily'
  ) then
    perform cron.unschedule((
      select jobid
      from cron.job
      where jobname = 'purge_deleted_records_daily'
      limit 1
    ));
  end if;

  perform cron.schedule(
    'purge_deleted_records_daily',
    '0 3 * * *',
    $purge$select public.purge_deleted_records();$purge$
  );
end;
$$;
