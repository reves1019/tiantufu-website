import assert from 'node:assert/strict'
import { memberGallery } from '../src/lib/memberGallery.ts'
import { exhibitionCatalog } from '../src/lib/exhibitionCatalog.ts'
const member = { id: 'real', name: '改名后的作者', work: { image: '/one.webp', fullImage: '/one-hd.jpg', title: '代表作', desc: '' }, works: [{ image: '/one.webp', title: '重复' }, { image: '/extra.webp', title: '独立作品', desc: '' }, { image: '/sample.webp', title: '占位作品' }] }
const works = [{ id: 'first', authorMemberId: 'real', author: '旧名字', image: '/one.webp', title: '馆藏代表作', desc: '' }, { id: 'second', authorMemberId: 'real', author: '旧名字', image: '/two.webp', title: '新增地图', desc: '', story: '作者札记' }, { id: 'hidden', authorMemberId: 'real', image: '/hidden.webp', published: false, title: '未公开地图' }]
const gallery = memberGallery(member, 2, works)
assert.deepEqual(gallery.map((entry) => entry.work.image), ['/one.webp', '/two.webp', '/extra.webp'])
assert.equal(gallery[0].work.fullImage, '/one-hd.jpg')
assert.equal(gallery[1].titlePath, 'worksArchive.1.title')
assert.equal(gallery[1].work.story, '作者札记')
assert.equal(memberGallery(member, 2, works, true).length, 5)
assert.equal(memberGallery(member, 2, [{ ...works[0], published: false }]).some((entry) => entry.work.image === '/one.webp'), false)
assert.equal(exhibitionCatalog(works, [member], '代表作').length, 2)
assert.equal(exhibitionCatalog([], [member], '代表作').length, 1)
assert.equal(exhibitionCatalog([], [{ ...member, published: false }], '代表作').length, 0)
assert.equal(works.length, 3)
console.log('Author gallery passed: stable IDs, archive additions, original edit paths, HD fallback, deduplication, draft protection and retained source records')
