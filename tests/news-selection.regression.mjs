import assert from 'node:assert/strict'
const events = []
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail } }
globalThis.window = {
  location: { hash: '#news' },
  history: { pushState(_state, _title, hash) { window.location.hash = hash } },
  dispatchEvent(event) { events.push(event.detail.index) },
}
const { getActiveNewsIndex, setActiveNewsIndex } = await import('../src/lib/newsBus.ts')
assert.equal(getActiveNewsIndex(), null)
setActiveNewsIndex(2)
assert.equal(getActiveNewsIndex(), 2)
window.location.hash = '#news-detail?item=2'
setActiveNewsIndex(3)
assert.equal(window.location.hash, '#news-detail?item=3')
assert.equal(getActiveNewsIndex(), 3)
window.location.hash = '#news-detail?item=2'
assert.equal(getActiveNewsIndex(), 2)
for (const raw of ['-1', 'NaN', 'Infinity', '9007199254740992', '']) {
  window.location.hash = `#news-detail?item=${raw}`
  assert.equal(getActiveNewsIndex(), null)
}
const count = events.length
setActiveNewsIndex(-1)
setActiveNewsIndex(1.5)
assert.equal(events.length, count)
console.log('News navigation passed: selection, URL restoration, adjacent articles and invalid query protection')
