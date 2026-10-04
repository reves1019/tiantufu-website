-- Tiantufu shared content, member approval, and media policies.
-- Run in Supabase SQL Editor as the project owner. No service-role key is used by the browser.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  member_id text unique,
  bio text not null default '',
  avatar text not null default '',
  topic text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (display_name, bio, avatar) on public.profiles to authenticated;

-- Application notes are private: keep them separate from the publicly readable profile table.
create table if not exists public.member_applications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table public.member_applications enable row level security;
revoke all on public.member_applications from public, anon, authenticated;
grant select on public.member_applications to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.status = 'approved'
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "approved member profiles are public" on public.profiles;
create policy "approved member profiles are public"
  on public.profiles for select to anon, authenticated
  using (role = 'member' and status = 'approved');

drop policy if exists "users can read their own profile" on public.profiles;
create policy "users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "admins can read all profiles" on public.profiles;
create policy "admins can read all profiles"
  on public.profiles for select to authenticated
  using ((select private.is_admin()));

drop policy if exists "members can read their application note" on public.member_applications;
create policy "members can read their application note"
  on public.member_applications for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "admins can read application notes" on public.member_applications;
create policy "admins can read application notes"
  on public.member_applications for select to authenticated
  using ((select private.is_admin()));

create or replace function public.admin_list_member_applications()
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  status text,
  member_id text,
  topic text,
  note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin permission required' using errcode = '42501';
  end if;
  return query
  select p.id, u.email, p.username, p.display_name, p.status, p.member_id, p.topic,
         coalesce(a.note, ''), p.created_at
  from public.profiles p
  left join public.member_applications a on a.user_id = p.id
  join auth.users u on u.id = p.id
  where p.role = 'member'
  order by p.created_at desc;
end;
$$;
revoke all on function public.admin_list_member_applications() from public, anon;
grant execute on function public.admin_list_member_applications() to authenticated;

drop policy if exists "members can edit only their public copy" on public.profiles;
create policy "members can edit only their public copy"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    and status = 'approved'
    and (role = 'member' or (select private.is_admin()))
  )
  with check (
    id = (select auth.uid())
    and status = 'approved'
    and (role = 'member' or (select private.is_admin()))
  );

create or replace function private.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_name text;
begin
  requested_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  if requested_username is null then
    requested_username := 'member_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, username, display_name, role, status)
  values (
    new.id,
    requested_username,
    coalesce(requested_name, requested_username),
    'member',
    'pending'
  );
  insert into public.member_applications (user_id, note)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'note', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_tiantufu on auth.users;
create trigger on_auth_user_created_tiantufu
  after insert on auth.users
  for each row execute function private.on_auth_user_created();

create or replace function private.touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function private.touch_profile_updated_at();

create or replace function public.admin_set_member_status(
  target_user_id uuid,
  next_status text,
  target_member_id text default null,
  target_topic text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin permission required' using errcode = '42501';
  end if;
  if next_status not in ('rejected', 'pending') then
    raise exception 'invalid member status' using errcode = '22023';
  end if;
  update public.profiles
  set status = next_status,
      member_id = null,
      topic = coalesce(target_topic, topic)
  where id = target_user_id and role = 'member';
  if not found then
    raise exception 'member account not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_set_member_status(uuid, text, text, text) from public, anon;
grant execute on function public.admin_set_member_status(uuid, text, text, text) to authenticated;

create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.site_content (id, content) values ('main', '{}'::jsonb)
on conflict (id) do nothing;
alter table public.site_content enable row level security;
revoke all on public.site_content from public;
grant select on public.site_content to anon, authenticated;
grant update (content) on public.site_content to authenticated;

create or replace function private.touch_site_content_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
drop trigger if exists site_content_touch_updated_at on public.site_content;
create trigger site_content_touch_updated_at before update on public.site_content
  for each row execute function private.touch_site_content_updated_at();

drop policy if exists "site content is publicly readable" on public.site_content;
create policy "site content is publicly readable"
  on public.site_content for select to anon, authenticated using (true);
drop policy if exists "only admins update site content" on public.site_content;
create policy "only admins update site content"
  on public.site_content for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create or replace function public.admin_initialize_site_content(initial_site_content jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin permission required' using errcode = '42501';
  end if;
  if jsonb_typeof(initial_site_content) <> 'object'
     or jsonb_typeof(initial_site_content -> 'members') <> 'array' then
    raise exception 'valid site content is required' using errcode = '22023';
  end if;

  update public.site_content
  set content = initial_site_content
  where id = 'main' and content = '{}'::jsonb;
  if not found then
    raise exception 'site content is already initialized' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.admin_initialize_site_content(jsonb) from public, anon;
grant execute on function public.admin_initialize_site_content(jsonb) to authenticated;

drop function if exists public.admin_approve_member(uuid, text, text, jsonb);
create or replace function public.admin_approve_member(
  target_user_id uuid,
  target_member_id text,
  target_topic text,
  next_member_card jsonb,
  next_work_entry jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_content jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'admin permission required' using errcode = '42501';
  end if;
  if nullif(trim(target_member_id), '') is null
     or jsonb_typeof(next_member_card) is distinct from 'object'
     or (next_member_card ->> 'id') is distinct from target_member_id
     or jsonb_typeof(next_work_entry) is distinct from 'object'
     or (next_work_entry ->> 'id') is distinct from ('wa-' || target_member_id) then
    raise exception 'valid member page and work entry are required' using errcode = '22023';
  end if;

  update public.profiles
  set status = 'approved', member_id = target_member_id, topic = target_topic
  where id = target_user_id and role = 'member';
  if not found then
    raise exception 'member account not found' using errcode = 'P0002';
  end if;

  -- Append just the approved records to the latest server document. Never
  -- replace the entire JSON from the approving browser's potentially stale copy.
  update public.site_content s
  set content = jsonb_set(
    jsonb_set(
      s.content,
      '{members}',
      case
        when exists (
          select 1
          from jsonb_array_elements(s.content -> 'members') as item(value)
          where item.value ->> 'id' = target_member_id
        ) then s.content -> 'members'
        else (s.content -> 'members') || jsonb_build_array(next_member_card)
      end,
      true
    ),
    '{worksArchive}',
    case
      when exists (
        select 1
        from jsonb_array_elements(s.content -> 'worksArchive') as item(value)
          where item.value ->> 'id' = ('wa-' || target_member_id)
      ) then s.content -> 'worksArchive'
      else (s.content -> 'worksArchive') || jsonb_build_array(next_work_entry)
    end,
    true
  )
  where s.id = 'main'
    and jsonb_typeof(s.content -> 'members') = 'array'
    and jsonb_typeof(s.content -> 'worksArchive') = 'array'
  returning s.content into latest_content;
  if not found then
    raise exception 'initialize valid site content before approving a member' using errcode = 'P0001';
  end if;
  return latest_content;
end;
$$;
revoke all on function public.admin_approve_member(uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.admin_approve_member(uuid, text, text, jsonb, jsonb) to authenticated;

create or replace function public.admin_delete_member_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin permission required' using errcode = '42501';
  end if;
  delete from auth.users u
  using public.profiles p
  where u.id = target_user_id and p.id = u.id and p.role = 'member';
  if not found then
    raise exception 'member account not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_delete_member_account(uuid) from public, anon;
grant execute on function public.admin_delete_member_account(uuid) to authenticated;

create or replace function public.update_my_member_profile(
  next_display_name text,
  next_bio text,
  next_avatar text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  old_display_name text;
begin
  select * into current_profile from public.profiles p where p.id = (select auth.uid()) for update;
  if not found or current_profile.status <> 'approved' or current_profile.member_id is null then
    raise exception 'approved member page required' using errcode = '42501';
  end if;
  if current_profile.role not in ('member', 'admin') then
    raise exception 'member permission required' using errcode = '42501';
  end if;
  if nullif(trim(next_display_name), '') is null then
    raise exception 'display name is required' using errcode = '22023';
  end if;

  select item.value ->> 'name' into old_display_name
  from public.site_content s,
       lateral jsonb_array_elements(coalesce(s.content -> 'members', '[]'::jsonb)) as item(value)
  where s.id = 'main' and item.value ->> 'id' = current_profile.member_id
  limit 1;

  update public.profiles
  set display_name = trim(next_display_name), bio = coalesce(next_bio, ''), avatar = coalesce(next_avatar, '')
  where id = current_profile.id;

  update public.site_content s
  set content = jsonb_set(
    jsonb_set(
      s.content,
      '{members}',
      (
        select coalesce(jsonb_agg(
          case when item.value ->> 'id' = current_profile.member_id
            then item.value || jsonb_build_object(
              'name', trim(next_display_name), 'bio', coalesce(next_bio, ''), 'avatar', coalesce(next_avatar, '')
            )
            else item.value
          end order by item.ordinality
        ), '[]'::jsonb)
        from jsonb_array_elements(coalesce(s.content -> 'members', '[]'::jsonb)) with ordinality as item(value, ordinality)
      ),
      true
    ),
    '{worksArchive}',
    (
      select coalesce(jsonb_agg(
        case when item.value ->> 'authorMemberId' = current_profile.member_id
          or (not (item.value ? 'authorMemberId') and old_display_name is not null
              and item.value ->> 'author' = old_display_name
              and (select count(*) from jsonb_array_elements(coalesce(s.content -> 'members', '[]'::jsonb)) m
                   where m ->> 'name' = old_display_name) = 1)
          then item.value || jsonb_build_object('author', trim(next_display_name), 'authorMemberId', current_profile.member_id)
          else item.value
        end order by item.ordinality
      ), '[]'::jsonb)
      from jsonb_array_elements(coalesce(s.content -> 'worksArchive', '[]'::jsonb)) with ordinality as item(value, ordinality)
    ),
    true
  )
  where s.id = 'main';
end;
$$;
revoke all on function public.update_my_member_profile(text, text, text) from public, anon;
grant execute on function public.update_my_member_profile(text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tiantufu-media',
  'tiantufu-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;

create or replace function private.can_manage_tiantufu_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'member'
        and p.status = 'approved'
        and (storage.foldername(object_name))[1] = 'avatars'
        and (storage.foldername(object_name))[2] = (select auth.uid())::text
    );
$$;
revoke all on function private.can_manage_tiantufu_media(text) from public;
grant execute on function private.can_manage_tiantufu_media(text) to authenticated;

drop policy if exists "tiantufu media is publicly readable" on storage.objects;
create policy "tiantufu media is publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'tiantufu-media');

drop policy if exists "members upload own avatar and admins upload media" on storage.objects;
create policy "members upload own avatar and admins upload media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tiantufu-media' and (select private.can_manage_tiantufu_media(name)));

drop policy if exists "members update own avatar and admins update media" on storage.objects;
create policy "members update own avatar and admins update media"
  on storage.objects for update to authenticated
  using (bucket_id = 'tiantufu-media' and (select private.can_manage_tiantufu_media(name)))
  with check (bucket_id = 'tiantufu-media' and (select private.can_manage_tiantufu_media(name)));

drop policy if exists "members delete own avatar and admins delete media" on storage.objects;
create policy "members delete own avatar and admins delete media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tiantufu-media' and (select private.can_manage_tiantufu_media(name)));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'site_content'
    ) then
      alter publication supabase_realtime add table public.site_content;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
    ) then
      alter publication supabase_realtime add table public.profiles;
    end if;
  end if;
end;
$$;
