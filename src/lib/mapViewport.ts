export interface MapView { zoom: number; x: number; y: number }
export function clampView(view: MapView, imageWidth: number, imageHeight: number, width: number, height: number): MapView {
  const zoom = Math.max(1, Math.min(8, view.zoom))
  const maxX = Math.max(0, (imageWidth * zoom - width) / 2)
  const maxY = Math.max(0, (imageHeight * zoom - height) / 2)
  return { zoom, x: Math.max(-maxX, Math.min(maxX, view.x)) || 0, y: Math.max(-maxY, Math.min(maxY, view.y)) || 0 }
}
export function zoomAt(view: MapView, zoom: number, x: number, y: number): MapView {
  const next = Math.max(1, Math.min(8, zoom)), ratio = next / view.zoom
  return { zoom: next, x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio }
}
