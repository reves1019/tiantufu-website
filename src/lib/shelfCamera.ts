export type ShelfCamera = { zoom: number; x: number; y: number }
export type CameraPoint = { x: number; y: number }
export const MIN_SHELF_ZOOM = .35
export const MAX_SHELF_ZOOM = 10

/** Keep the world point under `from` pinned to `to`, including at zoom limits. */
export function zoomShelfAt(view: ShelfCamera, zoom: number, from: CameraPoint, to = from): ShelfCamera {
  const next = Math.max(MIN_SHELF_ZOOM, Math.min(MAX_SHELF_ZOOM, zoom))
  const ratio = next / view.zoom
  return { zoom: next, x: to.x - (from.x - view.x) * ratio, y: to.y - (from.y - view.y) * ratio }
}
