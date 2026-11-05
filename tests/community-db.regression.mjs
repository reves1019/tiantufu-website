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
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
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
  for(const [id,name,qq] of [[admin,'admin',''],[member,'member','123456789'],[other,'other','123456789'],[pending,'pending','987654321']])
    await db.query('insert into auth.users values($1,$2,$3)',[id,`${name}@example.invalid`,JSON.stringify({username:name,display_name:name,qq_number:qq})])
  await db.query("update public.profiles set role='admin',status='approved' where id=$1",[admin])
  await db.query("update public.profiles set status='approved',member_id='m-'||username where id=any($1::uuid[])",[[member,other]])
  const publicAuthor=(await as('anon',null,'select * from public.community_authors($1)',[[admin]])).rows[0]
  assert.equal(publicAuthor.display_name,'admin')
  assert.deepEqual(Object.keys(publicAuthor).sort(),['display_name','id','member_id'])
  await db.query("update public.site_content set content=$1 where id='main'",[JSON.stringify({members:[{id:'m-member',name:'member',work:{image:'map.png'}}],worksArchive:[{id:'map-1',title:'Map one',image:'map.png',author:'Cartographer',category:'历史地图',published:true}]})])
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.canEdit,false)
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.qq,'123456789')
  assert.equal((await as('authenticated',member,'select * from public.fu_whitelist')).rows.length,0)
  await denied('authenticated',other,"select public.admin_set_qq_whitelist('123456789','fake',true)")
  await denied('authenticated',member,"select public.update_my_member_profile('changed','bio','avatar')")
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123456789','QA member',true)")
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.canEdit,false,'Matching a claimed QQ alone does not grant access')
  await as('authenticated',admin,'select public.admin_verify_qq_member($1,$2)',[member,'123456789'])
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.canEdit,true)
  await denied('authenticated',admin,'select public.admin_verify_qq_member($1,$2)',[other,'123456789'])
  await denied('authenticated',other,'select public.admin_verify_qq_member($1,$2)',[other,'123456789'])
  assert.equal((await as('authenticated',other,'select public.community_access() a')).rows[0].a.canEdit,false)
  await as('authenticated',member,"select public.update_my_member_profile('updated member','bio','avatar')")
  console.log('QQ claims stay private; admin verification and unique binding are enforced by PostgreSQL; old profile RPC cannot bypass the capability.')

  const imageId='10000000-0000-4000-8000-000000000001',path=`${member}/${imageId}.png`
  await as('authenticated',member,"insert into storage.objects(bucket_id,name) values('tiantufu-gallery',$1)",[path])
  await as('authenticated',member,"insert into public.member_images(id,title,storage_path) values($1,'Private map',$2)",[imageId,path])
  assert.equal((await as('anon',null,'select * from public.member_images')).rows.length,0)
  assert.equal((await as('anon',null,"select * from storage.objects where bucket_id='tiantufu-gallery'")).rows.length,0)
  await denied('authenticated',other,"insert into storage.objects(bucket_id,name) values('tiantufu-gallery',$1)",[`${member}/spoof.png`])
  await denied('authenticated',other,"insert into public.member_images(owner_id,title,storage_path) values($1,'Spoof',$2)",[member,`${member}/spoof.png`])
  await as('authenticated',member,'update public.member_images set published=true where id=$1',[imageId])
  assert.equal((await as('anon',null,'select * from public.member_images')).rows.length,1)
  assert.equal((await as('anon',null,"select * from storage.objects where bucket_id='tiantufu-gallery'")).rows.length,1)
  assert.equal((await as('authenticated',other,"update public.member_images set title='hacked' where id=$1 returning id",[imageId])).rows.length,0)
  console.log('Gallery ownership, private drafts, published media reads, and storage folder isolation verified.')

  await denied('anon',null,"insert into public.work_comments(work_key,body) values('archive:map-1','anon')")
  await denied('authenticated',pending,"insert into public.work_comments(work_key,body) values('archive:map-1','pending')")
  await denied('authenticated',member,"insert into public.work_comments(work_key,user_id,body) values('archive:map-1',$1,'forged')",[other])
  await as('authenticated',member,"insert into public.work_comments(work_key,body) values('archive:map-1','A real comment')")
  assert.equal((await as('anon',null,'select * from public.work_comments')).rows.length,1)
  assert.equal((await as('authenticated',other,'delete from public.work_comments returning id')).rows.length,0)
  await as('authenticated',member,"insert into public.work_likes(work_key) values('archive:map-1')")
  await denied('authenticated',member,"insert into public.work_likes(work_key) values('archive:map-1')")
  assert.equal((await as('anon',null,"select public.work_like_count('archive:map-1') n")).rows[0].n,1)
  await denied('authenticated',member,"insert into public.work_likes(work_key) values('archive:missing')")
  console.log('Login/approval checks, comment ownership, public read filtering and unique likes verified.')

  const roomId='20000000-0000-4000-8000-000000000001'
  await as('authenticated',member,"insert into public.palace_rooms(id,name) values($1,'Private room')",[roomId])
  await as('authenticated',member,"insert into public.palace_items(room_id,work_key,crop) values($1,'archive:map-1','{\"x\":0.1,\"y\":0.1,\"w\":0.5,\"h\":0.4}')",[roomId])
  assert.equal((await as('authenticated',other,'select * from public.palace_rooms')).rows.length,0)
  assert.equal((await as('authenticated',other,'select * from public.palace_items')).rows.length,0)
  await denied('authenticated',other,"insert into public.palace_items(room_id,work_key) values($1,'archive:map-1')",[roomId])
  await assert.rejects(()=>as('authenticated',member,"insert into public.palace_items(room_id,work_key,crop) values($1,'gallery:'||$2,'{\"x\":0.8,\"y\":0,\"w\":0.5,\"h\":0.2}')",[roomId,imageId]),/check constraint/)
  await as('authenticated',admin,"select public.admin_set_qq_whitelist('123456789','QA member',false)")
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.canEdit,false)
  await denied('authenticated',member,"insert into storage.objects(bucket_id,name) values('tiantufu-gallery',$1)",[`${member}/revoked.png`])
  await denied('authenticated',member,"select public.update_my_member_profile('revoked','bio','avatar')")
  await denied('authenticated',member,'select * from public.claim_push_notifications()')
  assert.ok((await as('service_role',null,'select * from public.claim_push_notifications()')).rows.length>=1)
  assert.equal((await as('service_role',null,'select * from public.claim_push_notifications()')).rows.length,0,'Claims are leased and do not overlap')
  await denied('authenticated',other,"select public.admin_release_qq_member('123456789')")
  await as('authenticated',admin,"select public.admin_release_qq_member('123456789')")
  await as('authenticated',member,"select public.submit_my_qq('543210001')")
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.qq,'543210001')
  assert.equal((await as('authenticated',member,'select public.community_access() a')).rows[0].a.canEdit,false)
  console.log('Palace isolation, crop bounds, capability revocation, and server-only notification leases verified.')
  console.log('Scope: isolated PostgreSQL (PGlite), with auth/storage stand-ins. Not a live Supabase integration or browser push delivery test.')
} finally { await db.close() }
