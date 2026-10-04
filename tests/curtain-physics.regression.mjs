import assert from 'node:assert/strict'
import {
  createCurtainPhysics,
  stepCurtainPhysics,
  resetCurtainPhysics,
  getCurtainMetrics,
} from '../src/lib/curtainPhysics.ts'

const options = { columns: 42, rows: 48, width: 4.8, height: 4.9, top: 1.1 }
const fixedStep = 1 / 120
const makeState = () => createCurtainPhysics(options)
const pointer = (x, y, vx = 0, vy = 0, radius = 0.4) => ({ x, y, vx, vy, radius })
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const run = (state, seconds, input = null) => {
  let peakStretch = 0
  let peakSpeed = 0
  let peakAnchorError = 0
  let peakDisplacement = 0
  let peakSideways = 0
  for (let frame = 0; frame < Math.round(seconds / fixedStep); frame++) {
    stepCurtainPhysics(state, typeof input === 'function' ? input(frame * fixedStep) : input, fixedStep)
    const metrics = getCurtainMetrics(state)
    peakStretch = Math.max(peakStretch, metrics.maxStretch)
    peakSpeed = Math.max(peakSpeed, metrics.maxSpeed)
    peakAnchorError = Math.max(peakAnchorError, metrics.anchorError)
    peakDisplacement = Math.max(peakDisplacement, metrics.maxDisplacement)
    for (let index = 0; index < state.position.length; index += 3) {
      peakSideways = Math.max(peakSideways, Math.abs(state.position[index] - state.rest[index]))
    }
  }
  return { peakStretch, peakSpeed, peakAnchorError, peakDisplacement, peakSideways }
}

// Instrument round-trip: one known 50% extension must measure as 50%.
{
  const state = createCurtainPhysics({ columns: 1, rows: 2, width: 1, height: 2, top: 1 })
  state.position[4] = -2
  assert.equal(getCurtainMetrics(state).maxStretch, 0.5)
  state.position[0] = 0.125
  assert.equal(getCurtainMetrics(state).anchorError, 0.125)
}

// At rest there is no ambient drive, and gravity cannot stretch the text grid.
{
  const state = makeState()
  const baseline = run(state, 1)
  const metrics = getCurtainMetrics(state)
  assert.equal(metrics.anchorError, 0)
  assert.ok(metrics.maxDisplacement < 0.0001, `Idle grid drifted ${metrics.maxDisplacement}`)
  assert.ok(metrics.maxSpeed < 0.0001, `Idle grid is not still: ${metrics.maxSpeed}`)
  assert.ok(baseline.peakStretch < 0.001)
}

// A stationary local poke must react, while distant columns stay independent.
const local = makeState()
const nearColumn = 8
const nearX = local.rest[nearColumn * options.rows * 3]
const pokePeak = run(local, 1.4, pointer(nearX - 0.06, -2.1))
const poked = getCurtainMetrics(local)
const near = poked.columnOffsets[nearColumn]
const far = Math.max(...poked.columnOffsets.slice(30))
assert.ok(near > 0.035, `Local poke did not visibly part a string: ${near}`)
assert.ok(pokePeak.peakDisplacement > 0.55, `Stationary poke's node peak was too small: ${pokePeak.peakDisplacement}`)
assert.ok(far / near < 0.2, `Far-side bleed ${far / near} exceeded 20%`)
assert.equal(pokePeak.peakAnchorError, 0, 'Top anchors moved during a stationary poke')
assert.ok(pokePeak.peakStretch < 0.35, `Local poke tore a link: ${pokePeak.peakStretch}`)

// A real-world-style sweep (moving position AND velocity) must reach most columns.
{
  const state = makeState()
  const peakOffsets = new Array(options.columns).fill(0)
  let peakStretch = 0
  let peakDisplacement = 0
  let peakSideways = 0
  for (let frame = 0; frame < 360; frame++) {
    const t = frame * fixedStep
    const x = -2.7 + 1.8 * t
    stepCurtainPhysics(state, pointer(x, -2.1, 1.8), fixedStep)
    const metrics = getCurtainMetrics(state)
    for (let column = 0; column < options.columns; column++) {
      peakOffsets[column] = Math.max(peakOffsets[column], metrics.columnOffsets[column])
    }
    peakStretch = Math.max(peakStretch, metrics.maxStretch)
    peakDisplacement = Math.max(peakDisplacement, metrics.maxDisplacement)
    for (let index = 0; index < state.position.length; index += 3) {
      peakSideways = Math.max(peakSideways, Math.abs(state.position[index] - state.rest[index]))
    }
    assert.equal(metrics.anchorError, 0, 'Top anchors moved during a pointer sweep')
  }
  const medianOffset = median(peakOffsets)
  assert.ok(medianOffset > 0.035, `Sweep median offset is only ${medianOffset}`)
  assert.ok(peakSideways > 0.6, `Sweep's node peak was too small: ${peakSideways}`)
  assert.ok(peakStretch < 0.35, `Sweep tore a link: ${peakStretch}`)
  console.log(`Sweep: median column peak ${medianOffset.toFixed(4)}; node displacement peak ${peakDisplacement.toFixed(4)}, sideways peak ${peakSideways.toFixed(4)} world units; worst stretch ${(peakStretch * 100).toFixed(4)}%.`)
}

// Release is verified by measured motion, not by assuming a fixed wait is enough.
let settled = false
let settleSeconds = 0
for (let frame = 0; frame < 120 * 18; frame++) {
  stepCurtainPhysics(local, null, fixedStep)
  const metrics = getCurtainMetrics(local)
  if (metrics.maxSpeed < 0.003 && metrics.maxDisplacement < 0.01) {
    settled = true
    settleSeconds = (frame + 1) * fixedStep
    break
  }
}
assert.ok(settled, `Strings did not return home: ${JSON.stringify(getCurtainMetrics(local))}`)
assert.equal(getCurtainMetrics(local).anchorError, 0)

// Abuse: huge and malformed velocities/radii must not cause tears or NaN output.
{
  const state = makeState()
  const abuse = run(state, 2, t => pointer(Math.sin(t * 32) * 2.6, -1.6 + Math.cos(t * 21), 1e9, -1e9, 1e9))
  assert.ok(abuse.peakSpeed <= 5.51, `Node velocity was not bounded: ${abuse.peakSpeed}`)
  assert.ok(abuse.peakStretch < 0.35, `Abuse tore a link: ${abuse.peakStretch}`)
  assert.equal(abuse.peakAnchorError, 0)
  assert.ok([...state.position, ...state.previous].every(Number.isFinite))
  for (let index = 0; index < state.position.length; index += 3) {
    assert.ok(Math.abs(state.position[index] - state.rest[index]) <= 2.200001, 'A glyph escaped sideways world bounds')
    assert.ok(Math.abs(state.position[index + 2]) <= 0.220001, 'A glyph escaped depth world bounds')
    assert.ok(state.position[index + 1] <= options.top + 0.000001, 'A glyph escaped above its roof peg')
    assert.ok(state.position[index + 1] >= options.top - options.height - 0.000001, 'A glyph escaped below the taut string length')
  }
  stepCurtainPhysics(state, pointer(NaN, Infinity, Infinity, NaN, NaN), fixedStep)
  stepCurtainPhysics(state, null, Infinity)
  stepCurtainPhysics(state, null, -1)
  stepCurtainPhysics(state, null, 12)
  assert.ok([...state.position, ...state.previous].every(Number.isFinite))
  assert.ok(getCurtainMetrics(state).maxDisplacement <= options.height)
  resetCurtainPhysics(state)
  assert.deepEqual(state.position, state.rest)
  assert.deepEqual(state.previous, state.rest)
  assert.equal(getCurtainMetrics(state).maxSpeed, 0)
  assert.equal(state.time, 0)
}

// The same fixed physics sequence grouped as 60 vs. 120 renderer frames is exact.
{
  const sixty = makeState()
  const oneTwenty = makeState()
  for (let frame = 0; frame < 180; frame++) {
    const t = frame / 60
    const input = t < 1.5 ? pointer(-1.4 + t, -1.9, 1) : null
    stepCurtainPhysics(sixty, input, 1 / 60)
    stepCurtainPhysics(oneTwenty, input, fixedStep)
    stepCurtainPhysics(oneTwenty, input, fixedStep)
  }
  assert.deepEqual(sixty.position, oneTwenty.position, 'Equivalent fixed-step frame grouping changed the trajectory')
  assert.deepEqual(sixty.previous, oneTwenty.previous)
}

assert.throws(() => createCurtainPhysics({ ...options, rows: 1 }), RangeError)
assert.throws(() => createCurtainPhysics({ ...options, width: NaN }), RangeError)
console.log(`Local poke: near ${near.toFixed(4)}, far ${far.toFixed(4)}, bleed ${(far / near * 100).toFixed(2)}%; node displacement peak ${pokePeak.peakDisplacement.toFixed(4)}, sideways peak ${pokePeak.peakSideways.toFixed(4)} world units; settled in ${settleSeconds.toFixed(2)}s.`)
console.log('Curtain physics regressions passed: local response, independent columns, hard-pinned anchors, bounded constraints/velocity, settling, reset and 60/120 fixed-step parity.')
