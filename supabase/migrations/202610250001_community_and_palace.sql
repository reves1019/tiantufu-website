-- Additive migration for the EXISTING Tiantufu backend. Does not bootstrap admins.
-- Apply after 202609290001. QQ numbers remain private; client metadata never grants roles.
begin;
alter table public.member_applications add column if not exists qq_number text;
create table public.fu_whitelist (
  qq_number text primary key check (qq_number ~ '^[1-9][0-9]{4,11}$'),
  label text not null default '' check (length(label) <= 100),
  active boolean not null default true,
  claimed_by uuid unique references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.fu_whitelist enable row level security;
revoke all on public.fu_whitelist from public, anon, authenticated;
grant select on public.fu_whitelist to authenticated;
create policy "admins read private QQ whitelist" on public.fu_whitelist for select to authenticated using (private.is_admin());

create function private.is_registered_member() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and status='approved');
$$;
create function private.can_edit_gallery() returns boolean language sql stable security definer set search_path='' as $$
  select private.is_admin() or exists (
    select 1 from public.fu_whitelist w join public.profiles p on p.id=w.claimed_by
    where w.claimed_by=auth.uid() and w.active and w.verified_at is not null and p.status='approved'
  );
$$;
revoke all on function private.is_registered_member(), private.can_edit_gallery() from public;
grant execute on function private.is_registered_member(), private.can_edit_gallery() to authenticated;

-- Keep the existing auth trigger. A second trigger captures only a validated QQ claim.
create function private.capture_qq_application() returns trigger language plpgsql security definer set search_path='' as $$
declare claimed text;
begin
  claimed := nullif(trim(new.raw_user_meta_data->>'qq_number'), '');
  if claimed is not null and claimed !~ '^[1-9][0-9]{4,11}$' then raise exception 'invalid QQ number'; end if;
  insert into public.member_applications(user_id, note, qq_number)
  values(new.id, coalesce(new.raw_user_meta_data->>'note',''), claimed)
  on conflict(user_id) do update set qq_number=excluded.qq_number;
  return new;
end; $$;
create trigger zz_capture_qq_application after insert on auth.users for each row execute function private.capture_qq_application();

create function public.community_access() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('canEdit', private.can_edit_gallery(), 'canInteract', private.is_registered_member(),
    'qq', (select qq_number from public.member_applications where user_id=auth.uid()),
    'cloud', true);
$$;
create function public.submit_my_qq(qq text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_registered_member() then raise exception 'approved account required' using errcode='42501'; end if;
  if trim(qq) !~ '^[1-9][0-9]{4,11}$' or qq is null then raise exception 'invalid QQ number'; end if;
  if exists(select 1 from public.fu_whitelist where claimed_by=auth.uid()) then raise exception 'ask an admin to change a verified QQ binding'; end if;
  insert into public.member_applications(user_id,qq_number) values(auth.uid(),trim(qq)) on conflict(user_id) do update set qq_number=excluded.qq_number;
end; $$;
revoke all on function public.submit_my_qq(text) from public,anon;
grant execute on function public.submit_my_qq(text) to authenticated;
create function public.admin_set_qq_whitelist(qq text, member_label text default '', enabled boolean default true)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'admin permission required' using errcode='42501'; end if;
  insert into public.fu_whitelist(qq_number,label,active) values(trim(qq),trim(member_label),enabled)
  on conflict(qq_number) do update set label=excluded.label,active=excluded.active;
end; $$;
create function public.admin_qq_applications() returns table(user_id uuid, display_name text, username text, status text, qq_number text, matched boolean, verified boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'admin permission required' using errcode='42501'; end if;
  return query select p.id,p.display_name,p.username,p.status,a.qq_number,
    coalesce(w.active,false), coalesce(w.active and w.claimed_by=p.id and w.verified_at is not null,false)
  from public.profiles p join public.member_applications a on a.user_id=p.id
  left join public.fu_whitelist w on w.qq_number=a.qq_number where p.role='member' order by p.created_at desc;
end; $$;
create function public.admin_verify_qq_member(target_user uuid, confirmed_qq text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'admin permission required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p join public.member_applications a on a.user_id=p.id
    where p.id=target_user and p.status='approved' and a.qq_number=confirmed_qq) then
    raise exception 'approve the account and verify its submitted QQ first';
  end if;
  update public.fu_whitelist set claimed_by=target_user,verified_by=auth.uid(),verified_at=now()
    where qq_number=confirmed_qq and active and (claimed_by is null or claimed_by=target_user);
  if not found then raise exception 'QQ is not active or already belongs to another account'; end if;
end; $$;
create function public.admin_release_qq_member(qq text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'admin permission required' using errcode='42501'; end if;
  update public.fu_whitelist set active=false,claimed_by=null,verified_by=null,verified_at=null where qq_number=qq;
end; $$;
revoke all on function public.admin_release_qq_member(text) from public,anon;
grant execute on function public.admin_release_qq_member(text) to authenticated;
revoke all on function public.community_access(), public.admin_set_qq_whitelist(text,text,boolean), public.admin_qq_applications(), public.admin_verify_qq_member(uuid,text) from public,anon;
grant execute on function public.community_access(), public.admin_set_qq_whitelist(text,text,boolean), public.admin_qq_applications(), public.admin_verify_qq_member(uuid,text) to authenticated;
-- Only public display fields; never expose the profile's private account/application data.
create function public.community_authors(ids uuid[]) returns table(id uuid,display_name text,member_id text)
language sql stable security definer set search_path='' as $$
  select p.id,p.display_name,p.member_id from public.profiles p where p.id=any(ids) and p.status='approved' limit 1000;
$$;
revoke all on function public.community_authors(uuid[]) from public;
grant execute on function public.community_authors(uuid[]) to anon,authenticated;
create function public.community_author_account(member text) returns uuid language sql stable security definer set search_path='' as $$
  select id from public.profiles where member_id=member and status='approved' limit 1;
$$;
revoke all on function public.community_author_account(text) from public;
grant execute on function public.community_author_account(text) to anon,authenticated;

-- Existing profile RPC is SECURITY DEFINER: enforce the new capability inside a trigger too.
create function private.guard_member_profile_edit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid()=old.id and not private.is_admin() and not private.can_edit_gallery() and
    (new.display_name,new.bio,new.avatar) is distinct from (old.display_name,old.bio,old.avatar) then
    raise exception 'verified QQ membership required to edit profile' using errcode='42501';
  end if;
  return new;
end; $$;
create trigger guard_verified_profile before update on public.profiles for each row execute function private.guard_member_profile_edit();
create or replace function private.can_manage_tiantufu_media(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select private.is_admin() or (private.can_edit_gallery() and (storage.foldername(object_name))[1]='avatars'
    and (storage.foldername(object_name))[2]=auth.uid()::text);
$$;

create table public.member_images (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120), description text not null default '' check(length(description)<=3000),
  category text not null default '未分类' check(length(category) between 1 and 60),
  topic text not null default 'zhengshi' check(length(topic)<=60),
  storage_path text not null, published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(split_part(storage_path,'/',1)=owner_id::text)
);
alter table public.member_images enable row level security;
grant select on public.member_images to anon,authenticated;
grant insert,delete on public.member_images to authenticated;
grant update(title,description,category,topic,published) on public.member_images to authenticated;
create policy "read public images or own drafts" on public.member_images for select to anon,authenticated using(published or owner_id=auth.uid() or private.is_admin());
create policy "verified owners create images" on public.member_images for insert to authenticated with check(owner_id=auth.uid() and private.can_edit_gallery());
create policy "verified owners edit images" on public.member_images for update to authenticated using((owner_id=auth.uid() and private.can_edit_gallery()) or private.is_admin()) with check((owner_id=auth.uid() and private.can_edit_gallery()) or private.is_admin());
create policy "owners remove images" on public.member_images for delete to authenticated using(owner_id=auth.uid() or private.is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('tiantufu-gallery','tiantufu-gallery',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/avif']);
create policy "gallery read published or owned" on storage.objects for select to anon,authenticated using(bucket_id='tiantufu-gallery' and (
  (storage.foldername(name))[1]=auth.uid()::text or private.is_admin() or exists(select 1 from public.member_images i where i.storage_path=name and i.published)));
create policy "verified gallery uploads" on storage.objects for insert to authenticated with check(bucket_id='tiantufu-gallery' and private.can_edit_gallery() and (storage.foldername(name))[1]=auth.uid()::text);
create policy "gallery owner removes objects" on storage.objects for delete to authenticated using(bucket_id='tiantufu-gallery' and ((storage.foldername(name))[1]=auth.uid()::text or private.is_admin()));

-- Stable work keys: archive ID, member representative, or gallery UUID. URLs are not IDs.
create function private.readable_work(work_key text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare document jsonb; entry jsonb; member jsonb; work_id text;
begin
  if work_key like 'gallery:%' then return exists(select 1 from public.member_images where 'gallery:'||id::text=work_key and published); end if;
  select content into document from public.site_content where id='main';
  work_id:=substr(work_key,9);
  if work_key like 'archive:%' then
    select value into entry from jsonb_array_elements(coalesce(document->'worksArchive','[]')) where value->>'id'=work_id;
    if entry is null or coalesce((entry->>'published')::boolean,work_id not in ('w-shengming-2','w-shengxiong-2','w-baicai-2','w-weilai-1','w-weilai-2','w-changhe-1','w-changhe-2','w-xingtu-1','w-xingtu-2'))=false then return false; end if;
    select value into member from jsonb_array_elements(coalesce(document->'members','[]')) where
      case when entry->>'authorMemberId' is not null then value->>'id'=entry->>'authorMemberId' else value->>'name'=entry->>'author' end limit 1;
    return member is null or (coalesce((member->>'published')::boolean,member->>'id' not in ('weilai-zhitu','changhe-lingtu','xingtu-yuanyu'))
      and not (entry->>'image'=member->>'avatar' and coalesce(entry->>'desc','') ~ '作品图待上传|使用成员头像|头像作为临时封面'));
  elsif work_key like 'member:%' then
    select value into member from jsonb_array_elements(coalesce(document->'members','[]')) where value->>'id'=substr(work_key,8);
    return member is not null and coalesce((member->>'published')::boolean,member->>'id' not in ('weilai-zhitu','changhe-lingtu','xingtu-yuanyu')) and (member->'work'->>'image') is distinct from (member->>'avatar');
  end if;
  return false;
end; $$;
revoke all on function private.readable_work(text) from public;
grant execute on function private.readable_work(text) to anon,authenticated;
-- The public image policies reference this existing helper for admin access.
grant usage on schema private to anon;
grant execute on function private.is_admin() to anon;

create table public.work_comments(
  id uuid primary key default gen_random_uuid(),work_key text not null check(length(work_key)<=200),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check(length(trim(body)) between 1 and 1000),created_at timestamptz not null default now()
);
create index work_comments_by_work on public.work_comments(work_key,created_at);
create table public.work_likes(work_key text not null check(length(work_key)<=200),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(work_key,user_id));
alter table public.work_comments enable row level security;
alter table public.work_likes enable row level security;
grant select,insert,delete on public.work_comments to authenticated;
grant select on public.work_comments to anon;
grant select,insert,delete on public.work_likes to authenticated;
create policy "read comments on public works" on public.work_comments for select to anon,authenticated using(private.readable_work(work_key));
create policy "members comment" on public.work_comments for insert to authenticated with check(user_id=auth.uid() and private.is_registered_member() and private.readable_work(work_key));
create policy "authors and admins remove comments" on public.work_comments for delete to authenticated using(user_id=auth.uid() or private.is_admin());
create policy "read own likes" on public.work_likes for select to authenticated using(user_id=auth.uid());
create policy "members like" on public.work_likes for insert to authenticated with check(user_id=auth.uid() and private.is_registered_member() and private.readable_work(work_key));
create policy "remove own likes" on public.work_likes for delete to authenticated using(user_id=auth.uid());
create function public.work_like_count(key text) returns bigint language sql stable security definer set search_path='' as $$
  select count(*) from public.work_likes where work_key=key and private.readable_work(key);
$$;
grant execute on function public.work_like_count(text) to anon,authenticated;
create function private.comment_rate_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from public.work_comments where user_id=new.user_id and created_at>now()-interval '1 minute')>=5 then raise exception '评论过于频繁，请一分钟后再试'; end if;
  return new;
end; $$;
create trigger comment_rate_limit before insert on public.work_comments for each row execute function private.comment_rate_limit();

create table public.palace_rooms(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 40),color text not null default '#be965b' check(color ~ '^#[0-9a-fA-F]{6}$'),position integer not null default 0,unique(id,user_id));
create table public.palace_items(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  room_id uuid not null,work_key text not null check(length(work_key)<=200),note text not null default '' check(length(note)<=2000),crop jsonb,
  created_at timestamptz not null default now(),foreign key(room_id,user_id) references public.palace_rooms(id,user_id) on delete cascade,unique(user_id,room_id,work_key),
  check(crop is null or (jsonb_typeof(crop)='object' and crop ?& array['x','y','w','h'] and
    (crop->>'x')::numeric>=0 and (crop->>'y')::numeric>=0 and (crop->>'w')::numeric>0 and (crop->>'h')::numeric>0 and
    (crop->>'x')::numeric+(crop->>'w')::numeric<=1.001 and (crop->>'y')::numeric+(crop->>'h')::numeric<=1.001)));
create table public.member_interests(user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,categories text[] not null default '{}',check(cardinality(categories)<=30));
alter table public.palace_rooms enable row level security;
alter table public.palace_items enable row level security;
alter table public.member_interests enable row level security;
grant select,insert,update,delete on public.palace_rooms,public.palace_items,public.member_interests to authenticated;
create policy "private palace rooms" on public.palace_rooms for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_registered_member());
create policy "private palace items" on public.palace_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_registered_member() and private.readable_work(work_key));
create policy "own recommendation interests" on public.member_interests for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_registered_member());

-- Private browser subscriptions. Endpoint host is validated again by the sender (SSRF protection).
create table public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique check(length(endpoint)<=2048 and endpoint like 'https://%'),p256dh text not null check(length(p256dh)<=200),auth text not null check(length(auth)<=100),created_at timestamptz not null default now());
alter table public.push_subscriptions enable row level security;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
create policy "own browser subscriptions" on public.push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid() and private.is_registered_member());
create table public.gallery_notifications(id uuid primary key default gen_random_uuid(),image_id uuid unique references public.member_images(id) on delete cascade,
  work_key text not null unique,title text not null,category text not null,
  created_at timestamptz not null default now(),processed_at timestamptz,lease_until timestamptz);
create table public.push_deliveries(notification_id uuid references public.gallery_notifications(id) on delete cascade,subscription_id uuid references public.push_subscriptions(id) on delete cascade,
  delivered_at timestamptz,attempts integer not null default 0,primary key(notification_id,subscription_id));
alter table public.gallery_notifications enable row level security;
alter table public.push_deliveries enable row level security;
revoke all on public.gallery_notifications,public.push_deliveries from public,anon,authenticated;
grant all on public.fu_whitelist,public.member_images,public.work_comments,public.work_likes,public.palace_rooms,public.palace_items,public.member_interests,public.push_subscriptions,public.gallery_notifications,public.push_deliveries to service_role;
create function private.queue_gallery_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.published and (tg_op='INSERT' or not old.published) then insert into public.gallery_notifications(image_id,work_key,title,category) values(new.id,'gallery:'||new.id::text,new.title,new.category) on conflict(work_key) do nothing; end if;
  return new;
end; $$;
create trigger queue_gallery_notification after insert or update of published on public.member_images for each row execute function private.queue_gallery_notification();
create function private.queue_catalogue_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
  for item in select value from jsonb_array_elements(coalesce(new.content->'worksArchive','[]')) loop
    if private.readable_work('archive:'||(item->>'id')) and not exists(select 1 from jsonb_array_elements(coalesce(old.content->'worksArchive','[]')) previous
      where previous->>'id'=item->>'id' and coalesce((previous->>'published')::boolean,true)) then
      insert into public.gallery_notifications(work_key,title,category) values('archive:'||(item->>'id'),item->>'title',coalesce(item->>'category','未分类')) on conflict(work_key) do nothing;
    end if;
  end loop;
  return new;
end; $$;
create trigger queue_catalogue_notification after update on public.site_content for each row execute function private.queue_catalogue_notification();
create function public.claim_push_notifications() returns setof public.gallery_notifications language sql security definer set search_path='' as $$
  with candidates as (select id from public.gallery_notifications where processed_at is null and (lease_until is null or lease_until<now()) order by created_at for update skip locked limit 3)
  update public.gallery_notifications n set lease_until=now()+interval '5 minutes' from candidates c where n.id=c.id returning n.*;
$$;
create function public.push_work_visible(key text) returns boolean language sql stable security definer set search_path='' as $$ select private.readable_work(key); $$;
revoke all on function public.claim_push_notifications(), public.push_work_visible(text) from public,anon,authenticated;
grant execute on function public.claim_push_notifications(), public.push_work_visible(text) to service_role;
commit;
