/** The same deterministic sampling lattice is used for every map: no random reordering on render. */
export interface ParticlePlate { positions: Float32Array; colors: Float32Array; opacity: Float32Array }
export function particleSeed(index: number, channel = 0) {
  const value = Math.sin(index * 127.1 + channel * 311.7) * 43758.5453
  return value - Math.floor(value)
}
export function follow(current: number, target: number, dt: number, tightness = 8) {
  return current + (target - current) * (1 - Math.exp(-tightness * dt))
}
export function smoothMorph(progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  return t * t * (3 - 2 * t)
}
