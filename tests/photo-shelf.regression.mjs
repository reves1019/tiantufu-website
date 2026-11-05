import assert from 'node:assert/strict'
import { mapYear, photoShelfLayout } from '../src/lib/photoShelfLayout.ts'

assert.equal(mapYear('公元前 221 年'), -221)
assert.equal(mapYear('400 BCE'), -400)
assert.equal(mapYear('974–978'), 974)
assert.equal(mapYear('公元 1045 年'), 1045)
for (const unknown of ['20XX', '', undefined, '约十世纪', '2026-10-25']) assert.equal(mapYear(unknown), null)
const works = [
  { key: 'unknown', category: '世界地图', title: '1045 年的标题不作为年代', year: '20XX' },
  { key: 'recent', category: '历史地图', year: '1045' },
  { key: 'ancient', category: '历史地图', year: '公元前221年' },
  { key: 'range', category: '世界地图', year: '974–978' },
]
const flat = photoShelfLayout(works, 'flat'), time = photoShelfLayout(works, 'time')
assert.deepEqual(time.ordered.map(w => w.key), ['ancient', 'range', 'recent', 'unknown'])
assert.deepEqual([...flat.positions.keys()].sort(), [...time.positions.keys()].sort())
assert.equal(flat.groups.length, 2)
assert.deepEqual(flat.groups.find(g => g.name === '历史地图').keys, ['recent', 'ancient'])
for (const layout of [flat, time]) {
  assert.equal(layout.lines.filter(line => line.id.startsWith('card:')).length, works.length)
  for (const point of layout.positions.values()) {
    assert.ok(point.x > 0 && point.x < layout.width && point.y > 0 && point.y < layout.height)
    assert.ok(Math.abs(point.angle) >= 8 && Math.abs(point.angle) <= 20)
  }
}
console.log('Explicit historical dates, unknown-year placement, category separation, stable photo identities and connector coverage passed.')
const room = photoShelfLayout(works, 'flat', {kind:'room',name:'我的收藏室',keys:['ancient','range']})
assert.equal(room.center.name, '我的收藏室')
assert.equal(room.center.count, 2)
assert.equal(room.branches.length, 2)
assert.notDeepEqual(room.positions.get('ancient'), flat.positions.get('ancient'))
assert.equal(room.lines.filter(line=>line.id.startsWith('branch:')).length, 2)
assert.deepEqual(room.lines.filter(line=>line.id.startsWith('card:')).map(line=>line.id).sort(), ['card:ancient','card:range'])
const empty = photoShelfLayout(works, 'flat', {kind:'room',name:'空收藏室',keys:[]})
assert.equal(empty.center.count,0)
assert.equal(empty.lines.length,0)
assert.equal(empty.branches.length,0)
console.log('Collection-centered graph re-layout, category branches, membership-only connectors and empty rooms passed.')
