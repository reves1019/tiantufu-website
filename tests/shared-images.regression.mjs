import assert from 'node:assert/strict'
import { collectImageReferences, prepareSharedImages } from '../src/lib/sharedImages.ts'

const doc = {
  ui: { image: '图片说明（不可当图片上传）' },
  site: { link: '/uploads/local.png' },
  media: { brand: { wordmark: '/uploads/local.png' }, maps: ['/maps/map-01.jpg'] },
  homeAtlas: { scenes: [{ roof: 'atlas/roof.png', title: '/uploads/local.png' }] },
  members: [{ avatar: '/uploads/local.png', work: { image: 'data:image/png;base64,YQ==' }, works: [{ image: 'https://images.example.com/shared.webp' }] }],
  worksArchive: [{ image: '/uploads/local.png', desc: '原文不能改变' }],
  contest: { works: [{ image: '/uploads/local.png' }] },
}
assert.equal(collectImageReferences(doc).length, 8)
const before = structuredClone(doc)
let fetchCount = 0, uploadCount = 0
const options = {
  origin: 'https://tiantufu.com',
  fetchImage: async (url) => {
    fetchCount++
    return new Response(url, { headers: { 'Content-Type': url.includes('.jpg') ? 'image/jpeg' : 'image/png' } })
  },
  upload: async (file, path) => {
    uploadCount++
    assert.match(path, /^site\/migrated\/[a-f0-9]{64}\.(png|jpg)$/)
    assert.ok(file.size > 0)
    return `https://cloud.example.com/${path}`
  },
}
const result = await prepareSharedImages(doc, options)
assert.deepEqual(doc, before, 'source document must remain unchanged')
assert.equal(fetchCount, 4, 'duplicate references and existing external images must not reupload')
assert.equal(uploadCount, 4)
assert.match(result.media.brand.wordmark, /^https:\/\/cloud\.example\.com\//)
assert.equal(result.members[0].avatar, result.worksArchive[0].image)
assert.equal(result.members[0].works[0].image, doc.members[0].works[0].image)
assert.equal(result.homeAtlas.scenes[0].title, doc.homeAtlas.scenes[0].title)
assert.equal(result.site.link, doc.site.link)
assert.equal(result.ui.image, doc.ui.image)
await assert.rejects(() => prepareSharedImages(doc, { ...options, fetchImage: async () => new Response('missing', { status: 404 }) }), /media.brand.wordmark.*404/)
await assert.rejects(() => prepareSharedImages(doc, { ...options, upload: async () => { throw new Error('bucket denied') } }), /bucket denied.*原有网站内容未替换/)
await assert.rejects(() => prepareSharedImages(doc, { ...options, fetchImage: async () => new Response('html', { headers: { 'Content-Type': 'text/html' } }) }), /PNG.*JPEG/)
assert.deepEqual(doc, before, 'failed migrations preserve source data')
console.log('Image migration regressions passed: all current image fields, duplicate deduplication, HTTPS preservation, unchanged text/links, failed-read/type/upload safety. The uploader is mocked; live Supabase storage remains unverified.')
