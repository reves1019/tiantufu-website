-- Run as the Supabase project owner only after the three intended auth users
-- exist and the cloud-backend migration has been applied.
-- Replace the three email placeholders. Do not commit real administrator emails.
-- This maps each administrator to the existing member page and makes these
-- three the only approved administrators.

do $$
declare
  selected_admin_ids uuid[];
  selected_admin_count integer;
begin
  select array_agg(distinct u.id), count(distinct u.id)
  into selected_admin_ids, selected_admin_count
  from auth.users u
  join (values
    (lower('ADMIN_1_EMAIL'), 'reves', '笙茗Reves', 'shengming-reves', 'zhengshi'),
    (lower('ADMIN_2_EMAIL'), 'shengxiong', '圣雄肝帝', 'shengxiong-gandi', 'ban-jiakong'),
    (lower('ADMIN_3_EMAIL'), 'baicai', '子虚的白菜', 'zixu-debaicai', 'quan-jiakong')
  ) as requested(email, username, display_name, member_id, topic)
    on lower(u.email) = requested.email;

  if selected_admin_count is distinct from 3 then
    raise exception 'Expected exactly three distinct Supabase users for the administrator emails; found %',
      coalesce(selected_admin_count, 0);
  end if;

  -- Demote any stray administrator before enforcing the exact three-account set.
  update public.profiles
  set role = 'member'
  where role = 'admin' and not (id = any(selected_admin_ids));

  update public.profiles p
  set username = requested.username,
      display_name = requested.display_name,
      role = 'admin',
      status = 'approved',
      member_id = requested.member_id,
      topic = requested.topic
  from (values
    (lower('ADMIN_1_EMAIL'), 'reves', '笙茗Reves', 'shengming-reves', 'zhengshi'),
    (lower('ADMIN_2_EMAIL'), 'shengxiong', '圣雄肝帝', 'shengxiong-gandi', 'ban-jiakong'),
    (lower('ADMIN_3_EMAIL'), 'baicai', '子虚的白菜', 'zixu-debaicai', 'quan-jiakong')
  ) as requested(email, username, display_name, member_id, topic)
  join auth.users u on lower(u.email) = requested.email
  where p.id = u.id;

  if (select count(*) from public.profiles where role = 'admin' and status = 'approved') <> 3 then
    raise exception 'Administrator profile setup did not resolve to exactly three approved admins';
  end if;
end;
$$;

select p.username, p.display_name, p.member_id, p.role, p.status
from public.profiles p
where p.role = 'admin' and p.status = 'approved'
order by p.username;
