import assert from 'node:assert/strict'
import { classifyCloudSnapshot, compareCloudVersions, isCurrentCloudSave } from '../src/lib/cloudVersion.ts'

const v1 = '2026-10-01T04:00:00.123001Z'
const v2 = '2026-10-01T04:00:00.123002Z'
const v3 = '2026-10-01T04:00:00.123003Z'
assert.equal(compareCloudVersions(v1, v2), -1, 'same-millisecond updates must remain ordered')
assert.equal(compareCloudVersions(v3, v2), 1)
assert.equal(compareCloudVersions(v2, '2026-10-01T12:00:00.123002+08:00'), 0)
assert.equal(compareCloudVersions('2026-10-01T04:00:00Z', v1), -1)
assert.equal(isCurrentCloudSave('new draft', 'older draft', v2, v2), false)
assert.equal(isCurrentCloudSave('draft', 'draft', v2, v3), false)
assert.equal(isCurrentCloudSave('draft', 'draft', v2, v2), true)
assert.equal(isCurrentCloudSave('draft', 'draft', 'invalid', 'invalid'), false)

const input = {
  currentJson: 'new draft', incomingJson: 'cloud base', dirty: true,
  savingJson: 'older draft', incomingVersion: v1, baseVersion: v1, newestVersion: v1,
}
assert.equal(classifyCloudSnapshot(input), 'same-base', 'reconnect preserves unpublished draft')
assert.equal(classifyCloudSnapshot({ ...input, incomingJson: 'older draft', incomingVersion: v2, newestVersion: v2 }), 'own-echo')
assert.equal(classifyCloudSnapshot({ ...input, incomingJson: 'another admin change', incomingVersion: v2, newestVersion: v2 }), 'conflict')
assert.equal(classifyCloudSnapshot({ ...input, incomingJson: 'new draft', incomingVersion: v2, newestVersion: v2 }), 'accept')
assert.equal(classifyCloudSnapshot({ ...input, dirty: false, incomingVersion: v1, newestVersion: v3 }), 'stale')
assert.equal(classifyCloudSnapshot({ ...input, dirty: false, incomingVersion: v2, newestVersion: v2 }), 'accept')

console.log('Cloud version regressions passed: microsecond ordering, stale acknowledgement protection, reconnect draft preservation, own-save echoes and concurrent-admin conflicts. These are deterministic client tests, not a live Supabase integration test.')
