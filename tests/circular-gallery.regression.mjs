import assert from 'node:assert/strict'
import { galleryActiveIndex, galleryPose, normalizeAngle } from '../src/lib/circularGallery.ts'
assert.equal(galleryActiveIndex(0, 0), 0)
assert.equal(galleryActiveIndex(0, 3), 0)
assert.equal(galleryActiveIndex(-120, 3), 1)
assert.equal(galleryActiveIndex(120, 3), 2)
assert.equal(galleryActiveIndex(-480, 3), 1)
assert.equal(normalizeAngle(370), 10)
assert.equal(normalizeAngle(-370), -10)
const front = galleryPose(0, 540)
assert.equal(front.x, 0); assert.equal(front.z, 0); assert.equal(front.opacity, 1)
for (let angle = -720; angle <= 720; angle += 10) {
  const pose = galleryPose(angle, 540)
  assert.ok(Object.values(pose).every(Number.isFinite))
  assert.ok(pose.opacity >= .38 && pose.opacity <= 1)
  assert.ok(Math.abs(pose.tilt) <= 24)
}
console.log('Circular gallery: wraparound navigation, empty data, perspective geometry and readable opacity passed')
