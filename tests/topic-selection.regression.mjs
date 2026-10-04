import assert from 'node:assert/strict'
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }
globalThis.window = { location: { hash: '#topic?id=ban-jiakong' }, history: { replaceState: (_a,_b,hash) => { window.location.hash = hash } }, dispatchEvent: () => {} }
const { getActiveTopicId, setActiveTopicId } = await import('../src/lib/topicBus.ts')
assert.equal(getActiveTopicId(), 'ban-jiakong')
setActiveTopicId('quan-jiakong')
assert.equal(window.location.hash, '#topic?id=quan-jiakong')
window.location.hash = '#directory'
assert.equal(getActiveTopicId(), 'quan-jiakong')
window.location.hash = '#topic?id=zhengshi'
assert.equal(getActiveTopicId(), 'zhengshi')
console.log('Topic selection passed: linked topic, session persistence, same-page update and URL priority')
