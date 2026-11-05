import assert from 'node:assert/strict'
import {normalizeCrop,recommendWorks} from '../src/lib/palaceModel.ts'
assert.deepEqual(normalizeCrop({x:.8,y:.9},{x:.2,y:.1}),{x:.2,y:.1,w:.6000000000000001,h:.8})
assert.deepEqual(normalizeCrop({x:-1,y:-2},{x:2,y:3}),{x:0,y:0,w:1,h:1})
assert.equal(normalizeCrop({x:.5,y:.5},{x:.51,y:.51}),null)
const works=[{key:'saved',category:'地形地图',title:'已收藏'},{key:'history',category:'历史地图',title:'历史'},{key:'terrain',category:'地形地图',title:'地形'},{key:'other',category:'设定图',title:'设定'}]
const ranked=recommendWorks(works,['历史地图'],[{work_key:'saved'}])
assert.deepEqual(ranked.map(r=>r.work.key),['history','terrain','other'])
assert.equal(ranked[0].reason,'你关注了「历史地图」')
assert.equal(ranked[1].reason,'与你收藏的地图属于同一分类')
assert.equal(ranked[2].reason,'馆藏探索')
assert.equal(works.length,4)
console.log('Crop bounds/reversed selection, saved-work exclusion and explainable preference ranking passed.')
