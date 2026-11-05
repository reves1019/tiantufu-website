import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
if (!process.env.TTF_PGLITE_PACKAGE_JSON) throw new Error('Set TTF_PGLITE_PACKAGE_JSON to an installed @electric-sql/pglite package.json')
const { PGlite } = createRequire(process.env.TTF_PGLITE_PACKAGE_JSON)('@electric-sql/pglite')
const db = new PGlite()
const admin='00000000-0000-4000-8000-000000000001',member='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003',pending='00000000-0000-4000-8000-000000000004'
async function as(role,id,sql,params=[]) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??''])
  await db.exec(`set role ${role}`)
  try{return await db.query(sql,params)}finally{await db.exec('reset role')}
}
async function denied(role,id,sql,params=[]) { await assert.rejects(()=>as(role,id,sql,params), /permission|policy|verified|already belongs|not active|row-level|duplicate key|foreign key/i) }
try {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
    grant usage on schema auth,storage to anon,authenticated,service_role;
    grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;
  `)
  await db.exec(await readFile('supabase/migrations/202609290001_tiantufu_cloud_backend.sql','utf8'))
  await db.exec(await readFile('supabase/migrations/202610250001_community_and_palace.sql','utf8'))
  await db.exec(await readFile('supabase/migrations/202610260001_author_login_and_posts.sql','utf8'))
  await db.exec(await readFile('supabase/migrations/202610260002_simple_email_registration.sql','utf8'))
  for(const [id,email,name] of [[admin,'admin@example.invalid','admin'],[member,'123450001@qq.com','creator'],[other,'guest@example.invalid','visitor'],[pending,'123450002@qq.com','unverified']])
    await db.query('insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())',[id,email,JSON.stringify({username:name,display_name:name,qq_number:'123450001',role:'admin'})])
  await db.query("update public.profiles set role='admin',status='approved' where id=$1",[admin])
  for(let i=5;i<=7;i++) { const id=`00000000-0000-4000-8000-00000000000${i}`; await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,jsonb_build_object('username',$2::text))",[id,`admin${i}@example.invalid`]); await db.query("update public.profiles set role='admin',status='approved' where id=$1",[id]) }
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450001','QA',true)")
  const activate=async(id)=>(await as('authenticated',id,'select public.activate_email_member() ok')).rows[0].ok
  const access=async(id)=>(await as('authenticated',id,'select public.community_access() a')).rows[0].a
  const method=async(m)=>db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({amr:[{method:m}]})])
  await denied('anon',null,'select public.activate_email_member()')
  await denied('authenticated',member,'select * from private.verified_member_emails')
  await method('password')
  assert.equal(await activate(member),false,'Auto-confirm plus password is not email verification')
  assert.equal((await access(member)).canEdit,false)
  await method('otp')
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[member])
  assert.equal(await activate(member),false,'Unconfirmed email cannot activate')
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[member])
  assert.equal(await activate(member),true)
  assert.equal((await access(member)).canEdit,true,'Verified whitelisted QQ email automatically enables author')
  assert.equal(await activate(other),true,'Verified visitor needs no manual review')
  assert.equal((await access(other)).canInteract,true)
  assert.equal((await access(other)).canEdit,false,'Visitor and forged metadata cannot publish')
  await denied('authenticated',other,"insert into public.community_posts(topic,title) values('zhengshi','forged')")
  await as('authenticated',member,"insert into public.community_posts(topic,title,body,status) values('zhengshi','Auto-approved author','Reference notes','published')")
  const post=(await db.query('select id from public.community_posts')).rows[0].id
  await as('authenticated',other,"insert into public.work_comments(work_key,body) values($1,'Hello, cartographer')",[`post:${post}`])
  await as('authenticated',other,'insert into public.work_likes(work_key) values($1)',[`post:${post}`])
  await method('password')
  assert.equal(await activate(member),true,'Subsequent password login reuses verified ownership')
  assert.equal(await activate(other),true)
  assert.equal((await db.query('select role from public.profiles where id=$1',[member])).rows[0].role,'member')
  await db.query("update auth.users set email='123450001@qq.com' where id=$1",[other])
  assert.equal(await activate(other),false,'Changed email cannot reuse old ownership proof')
  await method('otp')
  assert.equal(await activate(other),true,'Binding conflict retains ordinary visitor access')
  assert.equal((await access(other)).canEdit,false,'Cannot steal an existing binding')
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450001','QA',false)")
  assert.equal(await activate(member),true)
  assert.equal((await access(member)).canEdit,false,'Re-login must not re-enable a disabled whitelist entry')
  await db.query("update public.profiles set status='rejected' where id=$1",[member])
  assert.equal(await activate(member),false,'Banned account remains banned')
  await db.query("update auth.users set email='123450003@qq.com.evil.invalid' where id=$1",[pending])
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450003','QA',true)")
  assert.equal(await activate(pending),true)
  assert.equal((await access(pending)).canEdit,false,'Only exact numeric @qq.com matches')
  assert.equal((await db.query("select count(*)::int n from public.profiles where role='admin'")).rows[0].n,4)
  console.log('PASS: email verification auto-approves visitors; exact QQ whitelist auto-enables creators; password re-login, comment/like access, private proof, spoof/claim conflict/disabled/rejected guards and four existing admins preserved.')
  console.log('Isolated PostgreSQL fixture; no live email delivery, migrations or cloud writes.')
} finally { await db.close() }
