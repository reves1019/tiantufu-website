/** Independent, top-pinned glyph strings. All coordinates are world units. */
export interface CurtainPhysicsOptions {
  columns: number
  rows: number
  width: number
  height: number
  top: number
}

export interface CurtainPointer {
  x: number
  y: number
  /** World units per second, not pixels or displacement per frame. */
  vx: number
  vy: number
  radius: number
}

export interface CurtainPhysicsState extends CurtainPhysicsOptions {
  count: number
  rowSpacing: number
  columnSpacing: number
  /** Column-major xyz: (column * rows + row) * 3. Row zero is pinned. */
  position: Float32Array
  previous: Float32Array
  rest: Float32Array
  /** Seconds represented by position - previous, for speed readouts. */
  lastDt: number
  time: number
}

export interface CurtainMetrics {
  /** Mean absolute sideways displacement of each column, excluding its peg. */
  columnOffsets: number[]
  maxSpeed: number
  /** Absolute link-length / rest-length deviation; .35 means 35%. */
  maxStretch: number
  anchorError: number
  maxDisplacement: number
}

const FIXED_STEP = 1 / 120
const DAMPING = 1.8
const GRAVITY = 5.4
const HOME_PULL = 3.2
const DEPTH_PULL = 12
const POINTER_PUSH = 42
const POINTER_VELOCITY_GAIN = 12
const MAX_POINTER_SPEED = 12
const MAX_NODE_SPEED = 5.5
const SOLVER_PASSES = 6

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

export function createCurtainPhysics(options: CurtainPhysicsOptions): CurtainPhysicsState {
  const { columns, rows, width, height, top } = options
  if (!Number.isInteger(columns) || columns < 1 || columns > 256
    || !Number.isInteger(rows) || rows < 2 || rows > 256
    || !Number.isFinite(width) || width <= 0
    || !Number.isFinite(height) || height <= 0
    || !Number.isFinite(top)) {
    throw new RangeError('Curtain needs 1–256 columns, 2–256 rows and finite positive dimensions.')
  }
  const count = columns * rows
  const position = new Float32Array(count * 3)
  const columnSpacing = columns > 1 ? width / (columns - 1) : 0
  const rowSpacing = height / (rows - 1)
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const index = (column * rows + row) * 3
      position[index] = columns > 1 ? -width / 2 + column * columnSpacing : 0
      position[index + 1] = top - row * rowSpacing
    }
  }
  return {
    ...options,
    count,
    rowSpacing,
    columnSpacing,
    position,
    previous: position.slice(),
    rest: position.slice(),
    lastDt: FIXED_STEP,
    time: 0,
  }
}

export function resetCurtainPhysics(state: CurtainPhysicsState): void {
  state.position.set(state.rest)
  state.previous.set(state.rest)
  state.lastDt = FIXED_STEP
  state.time = 0
}

function pinAnchors(state: CurtainPhysicsState): void {
  const { position, previous, rest, columns, rows } = state
  for (let column = 0; column < columns; column++) {
    const peg = column * rows * 3
    for (let axis = 0; axis < 3; axis++) {
      position[peg + axis] = rest[peg + axis]
      previous[peg + axis] = rest[peg + axis]
    }
  }
}

function solveLinks(state: CurtainPhysicsState): void {
  const { position, previous, rest, columns, rows, rowSpacing, height } = state
  const sidewaysLimit = Math.min(height * 0.65, 2.2)
  const depthLimit = Math.min(height * 0.06, 0.22)
  // There is deliberately no horizontal neighbour lookup or constraint.
  for (let pass = 0; pass < SOLVER_PASSES; pass++) {
    for (let column = 0; column < columns; column++) {
      const columnStart = column * rows * 3
      for (let row = 1; row < rows; row++) {
        const child = columnStart + row * 3
        const parent = child - 3
        const dx = position[child] - position[parent]
        const dy = position[child + 1] - position[parent + 1]
        const dz = position[child + 2] - position[parent + 2]
        const length = Math.hypot(dx, dy, dz)
        if (length < 1e-9) {
          position[child + 1] = position[parent + 1] - rowSpacing
          continue
        }
        const correction = (length - rowSpacing) / length
        const parentWeight = row === 1 ? 0 : 0.5
        const childWeight = row === 1 ? 1 : 0.5
        const parentDx = dx * correction * parentWeight
        const parentDy = dy * correction * parentWeight
        const parentDz = dz * correction * parentWeight
        const childDx = dx * correction * childWeight
        const childDy = dy * correction * childWeight
        const childDz = dz * correction * childWeight
        position[parent] += parentDx
        position[parent + 1] += parentDy
        position[parent + 2] += parentDz
        position[child] -= childDx
        position[child + 1] -= childDy
        position[child + 2] -= childDz
        // A geometric length correction is not another external impulse.
        // Move its history equally; only integrated force adds kinetic energy.
        previous[parent] += parentDx
        previous[parent + 1] += parentDy
        previous[parent + 2] += parentDz
        previous[child] -= childDx
        previous[child + 1] -= childDy
        previous[child + 2] -= childDz
      }
    }
  }

  // Six relaxed passes shape the string. A final root-to-tip length projection
  // prevents accumulated gravity/error from making a 48-row string elastic.
  // Only the child is moved here, so every already-projected parent stays valid.
  for (let column = 0; column < columns; column++) {
    const columnStart = column * rows * 3
    for (let row = 1; row < rows; row++) {
      const child = columnStart + row * 3
      const parent = child - 3
      const dx = position[child] - position[parent]
      const dy = Math.min(-rowSpacing * 0.2, position[child + 1] - position[parent + 1])
      const dz = position[child + 2] - position[parent + 2]
      const ratio = rowSpacing / Math.hypot(dx, dy, dz)
      const x = clamp(position[parent] + dx * ratio, rest[child] - sidewaysLimit, rest[child] + sidewaysLimit)
      const z = clamp(position[parent + 2] + dz * ratio, -depthLimit, depthLimit)
      const finalDx = x - position[parent]
      const finalDz = z - position[parent + 2]
      const y = position[parent + 1] - Math.sqrt(Math.max(0, rowSpacing ** 2 - finalDx ** 2 - finalDz ** 2))
      // This last projection removes residual length error; it must not add
      // energy as a new Verlet impulse down all 48 nodes at once.
      previous[child] += x - position[child]
      previous[child + 1] += y - position[child + 1]
      previous[child + 2] += z - position[child + 2]
      position[child] = x
      position[child + 1] = y
      position[child + 2] = z
      // Vertical placement is set by the taut string, not an independently
      // falling glyph. Discard axial gravity history after projection so it
      // cannot build up invisibly and turn into a sideways kick on a bend.
      previous[child + 1] = y
    }
  }
}

function integrate(state: CurtainPhysicsState, pointer: CurtainPointer | null, dt: number): void {
  const { position, previous, rest, columns, rows, height } = state
  const damping = Math.exp(-DAMPING * dt)
  const historyScale = dt / state.lastDt
  const maxTravel = MAX_NODE_SPEED * dt
  const sidewaysLimit = Math.min(height * 0.65, 2.2)
  const depthLimit = Math.min(height * 0.06, 0.22)
  const pointerValid = pointer && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)
  const radius = pointerValid ? clamp(Number.isFinite(pointer.radius) ? pointer.radius : 0.4, 0.15, 0.65) : 0
  const vx = pointerValid && Number.isFinite(pointer.vx) ? clamp(pointer.vx, -MAX_POINTER_SPEED, MAX_POINTER_SPEED) : 0
  const vy = pointerValid && Number.isFinite(pointer.vy) ? clamp(pointer.vy, -MAX_POINTER_SPEED, MAX_POINTER_SPEED) : 0
  const dtSquared = dt * dt

  pinAnchors(state)
  for (let column = 0; column < columns; column++) {
    for (let row = 1; row < rows; row++) {
      const index = (column * rows + row) * 3
      const x = position[index]
      const y = position[index + 1]
      const z = position[index + 2]
      let dx = (x - previous[index]) * damping * historyScale
      let dy = (y - previous[index + 1]) * damping * historyScale
      let dz = (z - previous[index + 2]) * damping * historyScale
      const travel = Math.hypot(dx, dy, dz)
      if (travel > maxTravel) {
        const scale = maxTravel / travel
        dx *= scale
        dy *= scale
        dz *= scale
      }

      // Gravity plus a weak home pull restores vertical text after release.
      // No wind, idle drive, random phase or cross-column force is injected.
      let ax = (rest[index] - x) * HOME_PULL
      let ay = -GRAVITY
      let az = -z * DEPTH_PULL
      if (pointerValid) {
        const pointerDx = x - pointer.x
        const pointerDy = y - pointer.y
        const distance = Math.hypot(pointerDx, pointerDy)
        if (distance < radius) {
          const falloff = (1 - distance / radius) ** 2
          const side = Math.abs(pointerDx) > 1e-6
            ? Math.sign(pointerDx)
            : (rest[index] < pointer.x ? -1 : (column % 2 === 0 ? -1 : 1))
          const lateral = distance > 1e-6 ? 0.25 + 0.75 * Math.abs(pointerDx) / distance : 1
          ax += (side * POINTER_PUSH * lateral + vx * POINTER_VELOCITY_GAIN) * falloff
          // The y response stays small: rows must remain readable as strings.
          ay += vy * 0.65 * falloff
          az += (3.5 + Math.abs(vx) * 0.35) * falloff
        }
      }

      previous[index] = x
      previous[index + 1] = y
      previous[index + 2] = z
      position[index] = clamp(x + dx + ax * dtSquared, rest[index] - sidewaysLimit, rest[index] + sidewaysLimit)
      position[index + 1] = clamp(y + dy + ay * dtSquared, state.top - height, state.top)
      position[index + 2] = clamp(z + dz + az * dtSquared, -depthLimit, depthLimit)
    }
  }
  solveLinks(state)
  pinAnchors(state)

  // Constraint corrections are motion too. Bound the implied final velocity,
  // including the solver, rather than limiting only the incoming Verlet term.
  for (let column = 0; column < columns; column++) {
    for (let row = 1; row < rows; row++) {
      const index = (column * rows + row) * 3
      const dx = position[index] - previous[index]
      const dy = position[index + 1] - previous[index + 1]
      const dz = position[index + 2] - previous[index + 2]
      const travel = Math.hypot(dx, dy, dz)
      if (travel > maxTravel) {
        const scale = maxTravel / travel
        previous[index] = position[index] - dx * scale
        previous[index + 1] = position[index + 1] - dy * scale
        previous[index + 2] = position[index + 2] - dz * scale
      }
    }
  }
  state.lastDt = dt
  state.time += dt
}

/** Call from the renderer's fixed-step loop; large/invalid resume deltas are guarded. */
export function stepCurtainPhysics(state: CurtainPhysicsState, pointer: CurtainPointer | null, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return
  const seconds = Math.min(dt, 1 / 15)
  const steps = Math.max(1, Math.ceil(seconds / FIXED_STEP - 1e-10))
  const substep = seconds / steps
  for (let step = 0; step < steps; step++) integrate(state, pointer, substep)
}

export function getCurtainMetrics(state: CurtainPhysicsState): CurtainMetrics {
  const { position, previous, rest, columns, rows, rowSpacing, lastDt } = state
  const columnOffsets = new Array<number>(columns).fill(0)
  let maxSpeed = 0
  let maxStretch = 0
  let anchorError = 0
  let maxDisplacement = 0
  for (let column = 0; column < columns; column++) {
    const columnStart = column * rows * 3
    for (let row = 0; row < rows; row++) {
      const index = columnStart + row * 3
      const displacement = Math.hypot(
        position[index] - rest[index],
        position[index + 1] - rest[index + 1],
        position[index + 2] - rest[index + 2],
      )
      maxDisplacement = Math.max(maxDisplacement, displacement)
      maxSpeed = Math.max(maxSpeed, Math.hypot(
        position[index] - previous[index],
        position[index + 1] - previous[index + 1],
        position[index + 2] - previous[index + 2],
      ) / lastDt)
      if (row === 0) {
        anchorError = Math.max(anchorError, displacement)
      } else {
        columnOffsets[column] += Math.abs(position[index] - rest[index]) / (rows - 1)
        const length = Math.hypot(
          position[index] - position[index - 3],
          position[index + 1] - position[index - 2],
          position[index + 2] - position[index - 1],
        )
        maxStretch = Math.max(maxStretch, Math.abs(length / rowSpacing - 1))
      }
    }
  }
  return { columnOffsets, maxSpeed, maxStretch, anchorError, maxDisplacement }
}
