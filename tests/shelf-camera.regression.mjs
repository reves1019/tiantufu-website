import assert from 'node:assert/strict'
import {zoomShelfAt, MIN_SHELF_ZOOM, MAX_SHELF_ZOOM} from '../src/lib/shelfCamera.ts'
const view={zoom:1.7,x:85,y:-31}, anchor={x:-125,y:180}
const before={x:(anchor.x-view.x)/view.zoom,y:(anchor.y-view.y)/view.zoom}
for(const zoom of [.01,.6,2.8,100]){
  const next=zoomShelfAt(view,zoom,anchor)
  assert.ok(next.zoom>=MIN_SHELF_ZOOM&&next.zoom<=MAX_SHELF_ZOOM)
  assert.ok(Math.abs((anchor.x-next.x)/next.zoom-before.x)<1e-9)
  assert.ok(Math.abs((anchor.y-next.y)/next.zoom-before.y)<1e-9)
}
const moved={x:anchor.x+47,y:anchor.y-32}, pinch=zoomShelfAt(view,3.4,anchor,moved)
assert.ok(Math.abs((moved.x-pinch.x)/pinch.zoom-before.x)<1e-9)
assert.ok(Math.abs((moved.y-pinch.y)/pinch.zoom-before.y)<1e-9)
const clamped=zoomShelfAt({zoom:MAX_SHELF_ZOOM,x:0,y:0},100,anchor,moved)
assert.equal(clamped.x,47);assert.equal(clamped.y,-32)
console.log('Cursor anchoring, moving pinch midpoint and both zoom limits passed.')
