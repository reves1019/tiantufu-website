import assert from 'node:assert/strict'
import { isMemberPublished, isWorkPublished, publicCatalog } from '../src/lib/publicCatalog.ts'
assert.equal(isMemberPublished({id:'weilai-zhitu'}),false)
assert.equal(isMemberPublished({id:'weilai-zhitu',published:true}),true)
assert.equal(isMemberPublished({id:'new-author'}),true)
assert.equal(isWorkPublished({id:'w-shengming-2'}),false)
assert.equal(isWorkPublished({id:'w-shengming-2',published:true}),true)
const members=[{id:'real',name:'Renamed',published:true},{id:'hidden',name:'Hidden',published:false}]
const works=[{id:'one',author:'Old name',authorMemberId:'real'}, {id:'two',author:'Hidden',authorMemberId:'hidden'}, {id:'three',author:'Renamed',published:false}]
assert.deepEqual(publicCatalog(works,members).map(entry=>entry.work.id),['one'])
assert.equal(works.length,3, 'Publication filtering must not delete editor content')
console.log('Public catalogue: old imports, explicit publication override, stable author IDs and retained editor records passed')
