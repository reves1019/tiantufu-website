-- Run only after storing project_url and tiantufu_push_dispatch_secret in Supabase Vault.
-- This schedules the prepared server function. No browser key can authorize dispatch.
-- Enable pg_cron and pg_net in the existing project's Extensions first.
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='project_url') or
     not exists(select 1 from vault.decrypted_secrets where name='tiantufu_push_dispatch_secret') then
    raise exception 'Create the project_url and tiantufu_push_dispatch_secret Vault secrets first';
  end if;
end; $$;
select cron.schedule('tiantufu-map-push','* * * * *', $$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url')||'/functions/v1/push-dispatch',
    headers:=jsonb_build_object('Content-Type','application/json','x-ttf-dispatch-secret',(select decrypted_secret from vault.decrypted_secrets where name='tiantufu_push_dispatch_secret')),
    body:='{}'::jsonb,timeout_milliseconds:=10000
  );
$$);
