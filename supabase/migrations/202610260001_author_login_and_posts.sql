-- Additive. Apply after 202610250001. Does not seed or expose private QQ numbers.
begin;

create function public.activate_qq_author() returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); qq text; entry public.fu_whitelist; profile public.profiles;
begin
  -- A confirmed email alone is insufficient when Auth email auto-confirm is enabled.
  -- Require a server-signed OTP authentication method, never user-editable metadata.
  if uid is null or not coalesce(auth.jwt()->'amr' @> '[{"method":"otp"}]'::jsonb,false) then return false; end if;
  select split_part(lower(email),'@',1) into qq from auth.users
    where id=uid and email_confirmed_at is not null and lower(email) ~ '^[1-9][0-9]{4,11}@qq\.com$';
  if qq is null then return false; end if;
  select * into entry from public.fu_whitelist where qq_number=qq for update;
  if not found or not entry.active or (entry.claimed_by is not null and entry.claimed_by<>uid) then return false; end if;
  if exists(select 1 from public.fu_whitelist where claimed_by=uid and qq_number<>qq) then return false; end if;
  select * into profile from public.profiles where id=uid for update;
  if not found or profile.status='rejected' then return false; end if;
  -- Existing admins keep their role and profile; this never creates an admin.
  update public.profiles set status='approved' where id=uid and role='member';
  update public.fu_whitelist set claimed_by=uid,verified_at=coalesce(verified_at,now()) where qq_number=qq;
  insert into public.member_applications(user_id,qq_number) values(uid,qq)
    on conflict(user_id) do update set qq_number=excluded.qq_number;
  return true;
end; $$;
revoke all on function public.activate_qq_author() from public,anon;
grant execute on function public.activate_qq_author() to authenticated;

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topic text not null check(topic in ('zhengshi','ban-jiakong','quan-jiakong')),
  kind text not null default 'text' check(kind in ('text','image','link')),
  title text not null default '' check(length(title)<=300),
  body text not null default '' check(length(body)<=20000),
  link text not null default '' check(length(link)<=2048 and (link='' or link ~ '^https://[^[:space:]]+$')),
  image_paths text[] not null default '{}' check(cardinality(image_paths)<=6),
  status text not null default 'draft' check(status in ('draft','published')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(status='draft' or (length(trim(title))>0 and
    ((kind='text' and length(trim(body))>0) or (kind='link' and link<>'') or (kind='image' and cardinality(image_paths)>0))))
);
create index community_posts_feed on public.community_posts(topic,status,created_at desc);
alter table public.community_posts enable row level security;
revoke all on public.community_posts from public,anon,authenticated;
grant select on public.community_posts to anon,authenticated;
grant insert,delete on public.community_posts to authenticated;
grant update(topic,kind,title,body,link,image_paths,status) on public.community_posts to authenticated;
grant all on public.community_posts to service_role;
create policy "published posts and own drafts" on public.community_posts for select to anon,authenticated
  using(status='published' or owner_id=auth.uid() or private.is_admin());
create policy "authors create own posts" on public.community_posts for insert to authenticated
  with check(owner_id=auth.uid() and private.can_edit_gallery());
create policy "authors edit own posts" on public.community_posts for update to authenticated
  using((owner_id=auth.uid() and private.can_edit_gallery()) or private.is_admin())
  with check((owner_id=auth.uid() and private.can_edit_gallery()) or private.is_admin());
create policy "owners remove own posts" on public.community_posts for delete to authenticated
  using(owner_id=auth.uid() or private.is_admin());
create function private.validate_post_media() returns trigger language plpgsql set search_path='' as $$
declare media text;
begin
  foreach media in array new.image_paths loop
    if media is null or media not like new.owner_id::text||'/'||new.id::text||'/%'
      or media ~ '\.\.' or media !~ '\.(jpeg|png|webp|gif|avif)$' then raise exception 'invalid post media path'; end if;
  end loop;
  new.updated_at:=now(); return new;
end; $$;
create trigger post_media_validation before insert or update on public.community_posts
  for each row execute function private.validate_post_media();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tiantufu-posts','tiantufu-posts',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/avif']);
create function private.readable_post_media(media text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.community_posts p where media=any(p.image_paths)
    and (p.status='published' or p.owner_id=auth.uid() or private.is_admin()));
$$;
revoke all on function private.readable_post_media(text) from public;
grant execute on function private.readable_post_media(text) to anon,authenticated;
create policy "read visible post media" on storage.objects for select to anon,authenticated
  using(bucket_id='tiantufu-posts' and (private.readable_post_media(name)
    or (storage.foldername(name))[1]=auth.uid()::text or private.is_admin()));
create policy "authors upload post media" on storage.objects for insert to authenticated
  with check(bucket_id='tiantufu-posts' and private.can_edit_gallery() and (storage.foldername(name))[1]=auth.uid()::text
    and exists(select 1 from public.community_posts p where p.id::text=(storage.foldername(name))[2] and p.owner_id=auth.uid()));
create policy "owners remove post media" on storage.objects for delete to authenticated
  using(bucket_id='tiantufu-posts' and ((storage.foldername(name))[1]=auth.uid()::text or private.is_admin()));

create function private.readable_post(key text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.community_posts where 'post:'||id::text=key and status='published');
$$;
revoke all on function private.readable_post(text) from public;
grant execute on function private.readable_post(text) to anon,authenticated;
create policy "read comments on public posts" on public.work_comments for select to anon,authenticated using(private.readable_post(work_key));
create policy "members comment on posts" on public.work_comments for insert to authenticated
  with check(user_id=auth.uid() and private.is_registered_member() and private.readable_post(work_key));
create policy "members like posts" on public.work_likes for insert to authenticated
  with check(user_id=auth.uid() and private.is_registered_member() and private.readable_post(work_key));
create or replace function public.work_like_count(key text) returns bigint language sql stable security definer set search_path='' as $$
  select count(*) from public.work_likes where work_key=key and (private.readable_work(key) or private.readable_post(key));
$$;
commit;
