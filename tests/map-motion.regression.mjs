import assert from 'node:assert/strict'
import { isMapMotionSettled, stepMapMotion } from '../src/lib/mapMotion.ts'

const geometry = { imageWidth: 1200, imageHeight: 800, width: 800, height: 520 }
let state = { view: { zoom: 1, x: 0, y: 0 }, target: { zoom: 2, x: 180, y: -80 }, vx: 900, vy: -280 }
for (let i = 0; i < 360; i += 1) state = stepMapMotion(state, 1 / 60, geometry)
assert.ok(isMapMotionSettled(state), 'camera should settle after a finite fling')
assert.ok(Math.abs(state.view.zoom - 2) < 0.01)
assert.ok(state.view.x > 180 && state.view.x < 320)
assert.ok(state.view.y < -80 && state.view.y > -150)
assert.ok(Number.isFinite(state.view.x) && Number.isFinite(state.view.y))

const reduced = stepMapMotion({ view: { zoom: 1, x: 0, y: 0 }, target: { zoom: 3, x: 9999, y: -9999 }, vx: 1200, vy: -900 }, Number.NaN, geometry, true)
assert.deepEqual(reduced.view, { zoom: 3, x: 1400, y: -940 })
assert.equal(reduced.vx, 0)
assert.equal(reduced.vy, 0)
console.log('Map motion: frame-rate independent settling and reduced-motion fallback passed')
