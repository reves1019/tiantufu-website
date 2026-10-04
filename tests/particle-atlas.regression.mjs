import assert from 'node:assert/strict'
import { follow, particleSeed, smoothMorph } from '../src/lib/particleAtlas.ts'
for (const fps of [30, 60, 120]) {
  let x = 0
  for (let i = 0; i < fps; i++) x = follow(x, 1, 1 / fps, 8)
  assert.ok(Math.abs(x - (1 - Math.exp(-8))) < 1e-10, `follow independent at ${fps} fps`)
}
assert.equal(smoothMorph(-1), 0); assert.equal(smoothMorph(2), 1); assert.equal(smoothMorph(.5), .5)
for (let i = 0; i < 1000; i++) { assert.equal(particleSeed(i), particleSeed(i)); assert.ok(particleSeed(i) >= 0 && particleSeed(i) < 1) }
console.log('Particle sampling and 30/60/120 fps following passed')
