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
  for(const [id,email,name] of [[admin,'admin@example.invalid','admin'],[member,'123450001@qq.com','author'],[other,'123450002@qq.com','reader'],[pending,'123450003@qq.com','pending']])
    await db.query('insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())',[id,email,JSON.stringify({username:name,display_name:name,qq_number:'123450001'})])
  await db.query("update public.profiles set role='admin',status='approved' where id=$1",[admin])
  for(let i=5;i<=7;i++) { const id=`00000000-0000-4000-8000-00000000000${i}`; await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,jsonb_build_object('username',$2::text))",[id,`admin${i}@example.invalid`]); await db.query("update public.profiles set role='admin',status='approved' where id=$1",[id]) }
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450001','QA only',true)")
  const activation=async(id)=> (await as('authenticated',id,'select public.activate_qq_author() ok')).rows[0].ok
  await denied('anon',null,'select public.activate_qq_author()')
  assert.equal(await activation(member),false,'No AMR claim cannot activate')
  await db.exec(`select set_config('request.jwt.claims','{"amr":[{"method":"password"}]}',false)`)
  assert.equal(await activation(member),false,'Confirmed email and password do not prove OTP ownership')
  await db.exec(`select set_config('request.jwt.claims','{"amr":[{"method":"otp"}]}',false)`)
  assert.equal(await activation(other),false,'Forged metadata QQ is ignored')
  await db.query('update auth.users set email_confirmed_at=null where id=$1',[member])
  assert.equal(await activation(member),false)
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[member])
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450001','QA only',false)")
  assert.equal(await activation(member),false,'Disabled entries stay disabled')
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450001','QA only',true)")
  await db.query("update public.profiles set status='rejected' where id=$1",[member])
  assert.equal(await activation(member),false,'Rejected account is not reactivated')
  await db.query("update public.profiles set status='pending' where id=$1",[member])
  assert.equal(await activation(member),true)
  assert.equal(await activation(member),true,'Idempotent activation')
  const profile=(await db.query('select role,status from public.profiles where id=$1',[member])).rows[0]
  assert.deepEqual(profile,{role:'member',status:'approved'})
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.canEdit,true)
  assert.equal((await as('authenticated',member,'select * from public.fu_whitelist')).rows.length,0)
  await db.query("update auth.users set email='123450001@qq.com' where id=$1",[other])
  assert.equal(await activation(other),false,'Bound QQ cannot be claimed by another UUID')
  assert.equal((await db.query("select count(*)::int n from public.profiles where role='admin'")).rows[0].n,4)
  console.log('OTP server-claim gate, private whitelist, confirmed-email ownership, disabled/rejected accounts, unique binding and four existing admin roles passed.')

  await db.query("update public.profiles set status='approved' where id=$1",[other])
  const post='10000000-0000-4000-8000-000000000001', path=`${member}/${post}/map.png`,key=`post:${post}`
  await denied('authenticated',other,"insert into public.community_posts(topic,title) values('zhengshi','unauthorized')")
  await denied('anon',null,"insert into public.community_posts(topic,title) values('zhengshi','anonymous')")
  await denied('authenticated',member,"insert into public.community_posts(owner_id,topic) values($1,'zhengshi')",[other])
  await as('authenticated',member,"insert into public.community_posts(id,topic,title) values($1,'zhengshi','Private draft')",[post])
  assert.equal((await as('anon',null,'select * from public.community_posts')).rows.length,0)
  assert.equal((await as('authenticated',other,'select * from public.community_posts')).rows.length,0)
  await as('authenticated',member,"insert into storage.objects(bucket_id,name) values('tiantufu-posts',$1)",[path])
  await as('authenticated',member,'update public.community_posts set image_paths=$1 where id=$2',[[path],post])
  assert.equal((await as('anon',null,"select * from storage.objects where bucket_id='tiantufu-posts'")).rows.length,0)
  await denied('authenticated',other,"insert into storage.objects(bucket_id,name) values('tiantufu-posts',$1)",[path])
  await denied('authenticated',member,"update public.community_posts set owner_id=$1 where id=$2",[other,post])
  for(const sql of ["update public.community_posts set topic='evil'", "update public.community_posts set link='javascript:alert(1)'", "update public.community_posts set status='published'", "update public.community_posts set image_paths=array['bad/path.png']", "update public.community_posts set image_paths=array[null]::text[]"])
    await assert.rejects(()=>as('authenticated',member,sql),/check constraint|invalid post media/)
  await as('authenticated',member,"update public.community_posts set body='A map and its sources',status='published' where id=$1",[post])
  assert.equal((await as('anon',null,'select * from public.community_posts')).rows.length,1)
  assert.equal((await as('anon',null,"select * from storage.objects where bucket_id='tiantufu-posts'")).rows.length,1)
  assert.equal((await as('authenticated',other,"update public.community_posts set title='hacked' returning id")).rows.length,0)
  assert.equal((await as('authenticated',other,"delete from public.community_posts returning id")).rows.length,0)
  await denied('anon',null,"insert into public.work_comments(work_key,body) values($1,'anon')",[key])
  await denied('authenticated',pending,"insert into public.work_likes(work_key) values($1)",[key])
  await as('authenticated',other,"insert into public.work_comments(work_key,body) values($1,'A useful reference')",[key])
  await as('authenticated',other,"insert into public.work_likes(work_key) values($1)",[key])
  await denied('authenticated',other,"insert into public.work_likes(work_key) values($1)",[key])
  assert.equal((await as('anon',null,'select public.work_like_count($1) n',[key])).rows[0].n,1)
  assert.equal((await as('anon',null,'select * from public.work_comments')).rows.length,1)
  await as('authenticated',member,"update public.community_posts set status='draft' where id=$1",[post])
  assert.equal((await as('anon',null,'select * from public.work_comments')).rows.length,0)
  assert.equal((await as('anon',null,'select public.work_like_count($1) n',[key])).rows[0].n,0)
  assert.equal((await as('anon',null,"select * from storage.objects where bucket_id='tiantufu-posts'")).rows.length,0)
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123450001','QA only',false)")
  assert.equal((await as('authenticated',member,"update public.community_posts set title='revoked' returning id")).rows.length,0)
  await denied('authenticated',member,"insert into storage.objects(bucket_id,name) values('tiantufu-posts',$1)",[`${member}/${post}/revoked.png`])
  await as('authenticated',member,'delete from public.community_posts where id=$1',[post])
  assert.equal((await db.query('select * from public.community_posts')).rows.length,0)
  await as('authenticated',member,"delete from storage.objects where bucket_id='tiantufu-posts' and name=$1",[path])
  assert.equal((await db.query("select * from storage.objects where bucket_id='tiantufu-posts'")).rows.length,0,'Owner can clean up media after post deletion')
  console.log('Post authorship, draft/media privacy, immutable ownership, input constraints, published discussion, unpublishing and permission revocation passed.')
  console.log('Isolated PostgreSQL fixture only; live Supabase email delivery and deployment remain unverified.')
} finally { await db.close() }
