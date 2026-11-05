import type { Point } from './types'

// 纯函数只计算意图。DOM 焦点、React 状态、CSS 由各自的层负责。
export function wrapIndex(index: number, length: number): number {
  return length > 0 ? ((index % length) + length) % length : -1
}

export function keyboardIndex(key: string, index: number, length: number): number | null {
  if (length <= 0) return null
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === 'ArrowLeft') return wrapIndex(index - 1, length)
  if (key === 'ArrowRight') return wrapIndex(index + 1, length)
  return null
}

/** 手指左移表示前进。纵向优先、短距离和对角线不切图，留给滚动/点击。 */
export function swipeStep(start: Point, end: Point, threshold = 45): -1 | 0 | 1 {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (Math.abs(dx) <= threshold || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}

/** CSS 尺寸可能缩放，先转局部比例，再乘画布真实像素尺寸。 */
export function canvasPoint(
  point: Point,
  bounds: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): Point | null {
  if (bounds.width <= 0 || bounds.height <= 0) return null
  return {
    x: (point.x - bounds.left) / bounds.width * width,
    y: (point.y - bounds.top) / bounds.height * height,
  }
}

/** RGBA 每四个值为一个像素；alpha < 128 视为已刮开。只在手势结束时扫描。 */
export function erasedFraction(pixels: Uint8ClampedArray): number {
  const count = Math.floor(pixels.length / 4)
  if (!count) return 0
  let erased = 0
  for (let index = 3; index < count * 4; index += 4) {
    if (pixels[index] < 128) erased++
  }
  return erased / count
}
