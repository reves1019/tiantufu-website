import assert from 'node:assert/strict'
import { canvasPoint, erasedFraction, keyboardIndex, swipeStep, wrapIndex } from '../src/recipes/interaction-atlas/model.ts'

// 边界语义：环绕、空数据、非导航键不抢占原生键盘操作。
assert.equal(wrapIndex(-1, 3), 2)
assert.equal(wrapIndex(7, 3), 1)
assert.equal(wrapIndex(0, 0), -1)
assert.equal(keyboardIndex('ArrowLeft', 0, 3), 2)
assert.equal(keyboardIndex('ArrowRight', 2, 3), 0)
assert.equal(keyboardIndex('Home', 2, 3), 0)
assert.equal(keyboardIndex('End', 0, 3), 2)
assert.equal(keyboardIndex('Tab', 0, 3), null)
assert.equal(keyboardIndex('End', 0, 0), null)

const start = { x: 120, y: 140 }
assert.equal(swipeStep(start, { x: 50, y: 150 }), 1)
assert.equal(swipeStep(start, { x: 220, y: 160 }), -1)
assert.equal(swipeStep(start, { x: 75, y: 140 }), 0, 'threshold is strictly more than 45px')
assert.equal(swipeStep(start, { x: 50, y: 240 }), 0, 'vertical movement remains scrolling')
assert.equal(swipeStep(start, { x: 50, y: 210 }), 0, 'diagonal tie must not change image')

// 同一张画布在半尺寸显示时，中心仍然映射到中心；不可见时不产生 NaN。
assert.deepEqual(canvasPoint({ x: 170, y: 190 }, { left: 50, top: 30, width: 240, height: 320 }, 480, 640), { x: 240, y: 320 })
assert.equal(canvasPoint(start, { left: 0, top: 0, width: 0, height: 100 }, 480, 640), null)
assert.equal(erasedFraction(new Uint8ClampedArray()), 0)
assert.equal(erasedFraction(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0])), .5)
assert.equal(erasedFraction(new Uint8ClampedArray([0, 0, 0, 127, 0, 0, 0, 128])), .5)
console.log('PASS interaction learning models: empty data, keyboard, swipe intent, scaled canvas and alpha coverage.')
