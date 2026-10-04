export function normalizeAngle(angle: number) { return ((angle + 180) % 360 + 360) % 360 - 180 }
export function galleryActiveIndex(rotation: number, count: number) {
  return count ? ((Math.round(-rotation / (360 / count)) % count) + count) % count : 0
}
export function galleryPose(angle: number, radius: number) {
  const radians = angle * Math.PI / 180
  return { x: Math.sin(radians) * radius, z: (Math.cos(radians) - 1) * radius,
    tilt: -Math.sin(radians) * 24, opacity: .38 + .62 * (Math.cos(radians) + 1) / 2 }
}
