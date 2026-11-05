-- READ ONLY. Run against the existing project before the new migration.
select to_regclass('public.profiles') as profiles,
       to_regclass('public.member_applications') as applications,
       to_regclass('public.site_content') as site_content,
       to_regclass('public.fu_whitelist') as community_already_installed;
select username,role,status,member_id from public.profiles where role='admin' order by username;
select id,updated_at,jsonb_typeof(content->'members') as members_type,
       jsonb_typeof(content->'worksArchive') as works_type from public.site_content;
select tablename,rowsecurity from pg_tables where schemaname='public'
  and tablename in ('profiles','member_applications','site_content');
select id,public,file_size_limit from storage.buckets where id in ('tiantufu-media','tiantufu-gallery');
