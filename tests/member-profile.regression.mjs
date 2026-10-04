import assert from 'node:assert/strict'
import { memberDomains, safePublicUrl } from '../src/lib/memberProfile.ts'
import { memberGallery } from '../src/lib/memberGallery.ts'
import { exhibitionCatalog } from '../src/lib/exhibitionCatalog.ts'

const member = { id: 'author', name: '作者', topic: 'history', domains: ['history', 'fantasy', 'history'], work: { title: '代表作', image: '/map.webp', desc: '', topic: 'fantasy', createdYear: '2026', setting: '架空世界', rights: '请联系作者授权' } }
assert.deepEqual(memberDomains(member), ['history', 'fantasy'])
assert.deepEqual(memberDomains({ topic: 'history' }), ['history'])
assert.deepEqual(memberDomains({ topic: 'history', domains: [] }), [])
assert.equal(exhibitionCatalog([], [member], '地图')[0].work.topic, 'fantasy')
assert.equal(memberGallery(member, 0, [])[0].work.createdYear, '2026')
assert.equal(memberGallery(member, 0, [])[0].path, 'members.0.work')
const archive = [{ id: 'map', authorMemberId: 'author', author: '旧昵称', image: '/map.webp', title: '档案版本', desc: '', topic: 'history', setting: '公元1045年', createdYear: '2025', rights: '档案授权声明' }]
const entry = memberGallery(member, 0, archive)[0]
assert.equal(entry.work.topic, 'history')
assert.equal(entry.work.rights, '档案授权声明')
assert.equal(entry.path, 'worksArchive.0')
assert.equal(member.work.topic, 'fantasy')
for (const value of ['javascript:alert(1)', 'data:text/html,hi', 'mailto:private@example.com', 'https://name:password@example.com', 'broken']) assert.equal(safePublicUrl(value), null)
assert.equal(safePublicUrl('https://example.com/author'), 'https://example.com/author')
console.log('Member profiles: legacy JSON, multiple domains, independent work topics, metadata edit paths and safe public links passed')
