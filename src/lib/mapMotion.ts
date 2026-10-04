import { clampView, type MapView } from './mapViewport.ts'

export interface MapMotionState {
  view: MapView
  target: MapView
  vx: number
  vy: number
}

const clampDt = (dt: number) => Math.min(1 / 20, Math.max(0, Number.isFinite(dt) ? dt : 0))
const follow = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt))

/** Advance a map camera without frame-rate dependent per-frame lerps. */
export function stepMapMotion(
  state: MapMotionState,
  dt: number,
  geometry: { imageWidth: number; imageHeight: number; width: number; height: number },
  reducedMotion = false,
): MapMotionState {
  const delta = clampDt(dt)
  const boundedTarget = clampView(state.target, geometry.imageWidth, geometry.imageHeight, geometry.width, geometry.height)
  if (reducedMotion || delta === 0) {
    return { view: boundedTarget, target: boundedTarget, vx: 0, vy: 0 }
  }

  const damping = Math.exp(-8.5 * delta)
  const vx = state.vx * damping
  const vy = state.vy * damping
  const driftedTarget = clampView({ ...boundedTarget, x: boundedTarget.x + vx * delta, y: boundedTarget.y + vy * delta }, geometry.imageWidth, geometry.imageHeight, geometry.width, geometry.height)
  const nextView: MapView = {
    zoom: follow(state.view.zoom, driftedTarget.zoom, 18, delta),
    x: follow(state.view.x, driftedTarget.x, 22, delta),
    y: follow(state.view.y, driftedTarget.y, 22, delta),
  }
  const settled = Math.abs(nextView.zoom - driftedTarget.zoom) < 0.0005 && Math.abs(nextView.x - driftedTarget.x) < 0.25 && Math.abs(nextView.y - driftedTarget.y) < 0.25 && Math.abs(vx) < 2 && Math.abs(vy) < 2
  return {
    view: settled ? driftedTarget : nextView,
    target: driftedTarget,
    vx: settled ? 0 : vx,
    vy: settled ? 0 : vy,
  }
}

export function isMapMotionSettled(state: MapMotionState): boolean {
  return state.vx === 0 && state.vy === 0 && state.view.zoom === state.target.zoom && state.view.x === state.target.x && state.view.y === state.target.y
}
