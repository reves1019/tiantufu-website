-- Email + nickname + password registration. No manual approval for new verified users.
-- Apply after 202610260001. Keeps existing admins, rejected accounts and private QQ bindings.
begin;
create table private.verified_member_emails (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  verified_at timestamptz not null default now()
);
revoke all on private.verified_member_emails from public,anon,authenticated;

create function public.activate_email_member() returns boolean
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); verified_email text; qq text; profile public.profiles; entry public.fu_whitelist;
begin
  if uid is null then return false; end if;
  select lower(email) into verified_email from auth.users where id=uid and email_confirmed_at is not null;
  if verified_email is null then return false; end if;
  select * into profile from public.profiles where id=uid for update;
  if not found or profile.status='rejected' then return false; end if;
  -- Store server-verified ownership, so future password sessions need no extra code.
  -- Merely disabling email confirmation or editing metadata cannot create this proof.
  if coalesce(auth.jwt()->'amr' @> '[{"method":"otp"}]'::jsonb,false) then
    insert into private.verified_member_emails(user_id,email) values(uid,verified_email)
      on conflict(user_id) do update set email=excluded.email,verified_at=now();
  end if;
  if not exists(select 1 from private.verified_member_emails where user_id=uid and email=verified_email) then return false; end if;
  update public.profiles set status='approved' where id=uid and role='member' and status='pending';
  if verified_email ~ '^[1-9][0-9]{4,11}@qq\.com$' then
    qq:=split_part(verified_email,'@',1);
    select * into entry from public.fu_whitelist where qq_number=qq for update;
    if found and entry.active and (entry.claimed_by is null or entry.claimed_by=uid)
      and not exists(select 1 from public.fu_whitelist where claimed_by=uid and qq_number<>qq) then
      update public.fu_whitelist set claimed_by=uid,verified_at=coalesce(verified_at,now()) where qq_number=qq;
      insert into public.member_applications(user_id,qq_number) values(uid,qq)
        on conflict(user_id) do update set qq_number=excluded.qq_number;
    end if;
  end if;
  return true;
end; $$;
revoke all on function public.activate_email_member() from public,anon;
grant execute on function public.activate_email_member() to authenticated;

-- Compatibility with a previously deployed OTP page; normal visitors use the new RPC.
create or replace function public.activate_qq_author() returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not public.activate_email_member() then return false; end if;
  return private.can_edit_gallery();
end; $$;
commit;
