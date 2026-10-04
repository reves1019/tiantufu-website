import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const migration = await readFile(
  new URL('../supabase/migrations/202609290001_tiantufu_cloud_backend.sql', import.meta.url),
  'utf8',
)
const adminBootstrap = await readFile(new URL('../supabase/bootstrap_admins.template.sql', import.meta.url), 'utf8')
const cloudClient = await readFile(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8')
const contentStore = await readFile(new URL('../src/lib/contentStore.tsx', import.meta.url), 'utf8')
const imageField = await readFile(new URL('../src/components/admin/ImageField.tsx', import.meta.url), 'utf8')
const compact = migration.toLowerCase().replace(/\s+/g, ' ')

// Direct profile updates can only touch the three public self-profile fields;
// privileged role/status/member linkage has to go through owner/admin routines.
assert.match(compact, /grant update \(display_name, bio, avatar\) on public\.profiles to authenticated/)
assert.doesNotMatch(compact, /grant update \([^)]*(role|status|member_id|username)[^)]*\) on public\.profiles to authenticated/)
assert.match(compact, /using \( id = \(select auth\.uid\(\)\) and status = 'approved'/)
assert.match(compact, /with check \( id = \(select auth\.uid\(\)\) and status = 'approved'/)

// New auth users are never promoted by user-controlled metadata.
const signupTrigger = compact.slice(compact.indexOf('create or replace function private.on_auth_user_created()'), compact.indexOf('create or replace function private.touch_profile_updated_at()'))
assert.match(signupTrigger, /'member', 'pending'/)
assert.doesNotMatch(signupTrigger, /raw_user_meta_data[^;]*role/)

// Approval is an admin-only transaction that appends just one member/work to
// the current server JSON and returns that canonical version to the client.
const approval = compact.slice(compact.indexOf('create or replace function public.admin_approve_member('), compact.indexOf('create or replace function public.admin_delete_member_account('))
assert.match(approval, /if not \(select private\.is_admin\(\)\) then/)
assert.match(approval, /next_member_card jsonb, next_work_entry jsonb/)
assert.match(approval, /\(s\.content -> 'members'\) \|\| jsonb_build_array\(next_member_card\)/)
assert.match(approval, /\(s\.content -> 'worksarchive'\) \|\| jsonb_build_array\(next_work_entry\)/)
assert.match(approval, /returning s\.content into latest_content/)
assert.match(approval, /return latest_content/)
assert.doesNotMatch(approval, /set content = next_site_content/)
assert.match(compact, /grant execute on function public\.admin_approve_member\(uuid, text, text, jsonb, jsonb\) to authenticated/)

// The client sends records, not a stale full-site snapshot, and installs the
// document returned by the transaction instead of reusing its old draft.
assert.match(cloudClient, /next_member_card: input\.member/)
assert.match(cloudClient, /next_work_entry: input\.work/)
assert.doesNotMatch(cloudClient, /next_site_content: input\.content/)
assert.match(contentStore, /member: bundle\.members\[0\]/)
assert.match(contentStore, /work: bundle\.worksArchive\[0\]/)
assert.match(contentStore, /const latestContent = withArchiveDefaults\(deepMerge\(defaultContent, cloudContent\)\)/)

// Restored cloud sessions are accepted only for approved profiles. If a
// member was left pending/rejected, the client session is cleared locally.
assert.match(contentStore, /if \(!profile \|\| profile\.status !== 'approved'\)/)
assert.match(contentStore, /await signOutCloudAccount\(\)\.catch\(\(\) => undefined\)/)
assert.match(cloudClient, /client\.auth\.signOut\(\{ scope: 'local' \}\)/)

// Shared content and profile/approval changes are part of the Realtime
// publication and the client refreshes its account state when profiles move.
assert.match(compact, /tablename = 'site_content'/)
assert.match(compact, /tablename = 'profiles'/)
assert.match(cloudClient, /table: 'profiles' \}, onChange\)/)
assert.match(contentStore, /subscribeCloudProfiles\(\(\) =>/)
assert.match(contentStore, /then\(\(user\) => syncCloudAccount\(user\?\.id \?\? null\)\)/)

// The three existing member pages are linked to the three cloud admin users;
// placeholders keep the email roster out of committed code.
for (const expected of [
  "'reves', '笙茗Reves', 'shengming-reves', 'zhengshi'",
  "'shengxiong', '圣雄肝帝', 'shengxiong-gandi', 'ban-jiakong'",
  "'baicai', '子虚的白菜', 'zixu-debaicai', 'quan-jiakong'",
]) assert.ok(adminBootstrap.includes(expected), `missing admin/member mapping ${expected}`)
assert.equal((adminBootstrap.match(/ADMIN_[123]_EMAIL/g) ?? []).length, 6)
assert.match(adminBootstrap, /role = 'admin',[\s\S]*status = 'approved',[\s\S]*member_id = requested\.member_id/)

// Image upload uses the shared bucket in cloud mode and scopes member uploads
// to that authenticated user's avatar folder; offline uploads remain local.
assert.match(imageField, /if \(cloudMode\)/)
assert.match(imageField, /`avatars\/\$\{await getCloudUserId\(\)\}\/\$\{filename\}`/)
assert.match(imageField, /`site\/\$\{filename\}`/)
assert.match(imageField, /uploadCloudImage\(file, path\)/)
assert.match(cloudClient, /from\('tiantufu-media'\)\.upload\(path, file/)

console.log('Cloud security regression checks passed: three-field self edits, pending-by-default registration, admin-gated approval, stale-document-safe member creation, canonical cloud response, approved-only restored sessions, realtime profile updates, and role-scoped image uploads.')
