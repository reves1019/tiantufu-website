import assert from 'node:assert/strict'
import { zoomAt, clampView } from '../src/lib/mapViewport.ts'
assert.deepEqual(zoomAt({zoom:1,x:0,y:0},2,100,50), {zoom:2,x:-100,y:-50})
assert.deepEqual(clampView({zoom:1,x:900,y:-800},800,500,900,600), {zoom:1,x:0,y:0})
assert.deepEqual(clampView({zoom:2,x:900,y:-800},800,500,900,600), {zoom:2,x:350,y:-200})
assert.equal(zoomAt({zoom:1,x:0,y:0},30,0,0).zoom,8)
console.log('Map viewport: pointer anchor and boundary constraints passed')
