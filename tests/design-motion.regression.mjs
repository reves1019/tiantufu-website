import assert from 'node:assert/strict'
import { defaultOptions, defaultPageMotion, motionRecipes, normalizeOptions, normalizePageMotion, transitionFrames, transitionIds } from '../src/recipes/design-motion/model.ts'
import { motionSources } from '../src/recipes/design-motion/sources.ts'

for (const value of [undefined, null, 'fade', [], {}, { preset: '__proto__' }, { preset: 'arbitrary-script', duration: 2 }]) {
  assert.deepEqual(normalizePageMotion(value), defaultPageMotion, 'unknown/legacy settings preserve original transition')
}
assert.deepEqual(normalizePageMotion({ preset: 'curtain', duration: Infinity, distance: NaN }), { preset: 'curtain', duration: 600, distance: 36 })
assert.deepEqual(normalizePageMotion({ preset: 'slide', duration: -1, distance: 9000 }), { preset: 'slide', duration: 160, distance: 100 })
assert.deepEqual(normalizePageMotion({ preset: 'fade', duration: 1e8, distance: -1 }), { preset: 'fade', duration: 1600, distance: 0 })
assert.deepEqual(normalizeOptions({ color: 'url(javascript:invalid)', duration: '1', distance: Infinity }), defaultOptions)
assert.equal(normalizeOptions({ color: '#abcdef', stagger: -50 }).color, '#abcdef')
assert.equal(normalizeOptions({ stagger: -50 }).stagger, 0)
assert.equal(normalizeOptions({ stagger: 999 }).stagger, 150)
for (const id of transitionIds) {
  const entering = transitionFrames(id, 'enter', 36), leaving = transitionFrames(id, 'leave', 36)
  assert.equal(entering.at(-1).opacity, 1, 'completed page must be visible')
  assert.equal(leaving.at(-1).opacity, 0, 'departing page must disappear')
  assert.ok(entering.length >= 2)
  assert.ok(!JSON.stringify(entering).includes('NaN'))
}
assert.equal(transitionFrames('slide', 'enter', 0)[0].transform, 'translateX(0px)')
assert.equal(transitionFrames('curtain', 'enter', 36).at(-1).clipPath, 'inset(0)')
assert.equal(transitionFrames('iris', 'enter', 36).at(-1).clipPath, 'circle(150% at 50% 50%)')
assert.equal(new Set(motionRecipes.map(recipe => recipe.id)).size, 14)
assert.equal(new Set(motionSources.map(source => source.id)).size, 10)
for (const source of motionSources) {
  assert.ok(motionRecipes.some(recipe => recipe.sourceIds.includes(source.id)), 'each requested source has a traceable reference')
  assert.equal(new URL(source.url).protocol, 'https:')
  assert.equal(new URL(source.exampleUrl).protocol, 'https:')
}
console.log('PASS design motion: legacy/invalid config, parameter bounds, complete transition endpoints and ten-source traceability.')
