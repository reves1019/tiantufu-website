import type { PalaceWork } from './palaceModel'

export type ShelfMode = 'flat' | 'time'
export type ShelfPoint = { x: number; y: number; angle: number }
export type ShelfGroup = { name: string; x: number; y: number; width: number; height: number; keys: string[] }
export type ShelfLine = { id: string; x1: number; y1: number; x2: number; y2: number }
export type ShelfHub = { kind: 'group' | 'room'; name: string; keys: string[] }
export type ShelfBranch = { name: string; x: number; y: number; count: number }
export const PHOTO_WIDTH = 108
export const PHOTO_HEIGHT = 152

// Only explicit year metadata is used. Placeholder dates, titles and upload times
// must never be silently converted to historical dates.
export function mapYear(year?: string): number | null {
  const value = year?.trim()
  if (!value) return null
  const match = value.match(/^(公元前|公元|前|BC\s*|BCE\s*)?\s*(-?\d{1,4})(?:\s*年)?(?:\s*[-–—~至]\s*\d{1,4}\s*年?)?(?:\s*(BCE|BC|CE|AD))?$/i)
  if (!match) return null
  const number = Number(match[2])
  return /前|BC/i.test(`${match[1] ?? ''}${match[3] ?? ''}`) ? -Math.abs(number) : number
}

export function photoShelfLayout(works: PalaceWork[], mode: ShelfMode, hub?: ShelfHub | null) {
  const categories = [...new Set(works.map(w => w.category || '未分类'))]
  const groups: ShelfGroup[] = []
  const positions = new Map<string, ShelfPoint>()
  const lines: ShelfLine[] = []
  const rowHeights: number[] = []
  categories.forEach((name, i) => {
    const count = works.filter(w => (w.category || '未分类') === name).length
    rowHeights[Math.floor(i / 3)] = Math.max(rowHeights[Math.floor(i / 3)] || 0, 110 + Math.ceil(count / 3) * 205)
  })
  const angle = (key: string) => {
    let hash = 0
    for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    return (hash % 2 ? 1 : -1) * (8 + hash % 13)
  }
  categories.forEach((name, i) => {
    const members = works.filter(w => (w.category || '未分类') === name)
    const group = { name, x: 65 + (i % 3) * 440, y: 55 + rowHeights.slice(0, Math.floor(i / 3)).reduce((a, b) => a + b + 55, 0), width: 385, height: 110 + Math.ceil(members.length / 3) * 205, keys: members.map(w => w.key) }
    groups.push(group)
    members.forEach((work, j) => positions.set(work.key, { x: group.x + 70 + (j % 3) * 124, y: group.y + 160 + Math.floor(j / 3) * 205, angle: angle(work.key) }))
  })
  let width = Math.max(650, Math.min(3, groups.length) * 440 + 65)
  let height = Math.max(580, rowHeights.reduce((a, b) => a + b + 55, 55))
  const ordered = [...works].sort((a, b) => (mapYear(a.year) ?? Infinity) - (mapYear(b.year) ?? Infinity) || a.key.localeCompare(b.key))
  if (mode === 'time') {
    width = Math.max(900, works.length * 190 + 160)
    height = 620
    ordered.forEach((work, i) => positions.set(work.key, { x: 140 + i * 190, y: i % 2 ? 425 : 185, angle: angle(work.key) }))
  }
  // Each card keeps one connector in both layouts, so its line morphs with it.
  works.forEach(work => {
    const p = positions.get(work.key)!
    const group = groups.find(g => g.keys.includes(work.key))!
    lines.push({ id: `card:${work.key}`, x1: p.x, y1: p.y, x2: mode === 'time' ? p.x : group.x + group.width / 2, y2: mode === 'time' ? 310 : group.y + 40 })
  })
  groups.forEach((group, i) => {
    const next = groups[i + 1]
    if (next) lines.push({ id: `group:${group.name}`, x1: group.x + group.width / 2, y1: group.y + 40, x2: next.x + next.width / 2, y2: next.y + 40 })
  })
  const branches: ShelfBranch[] = []
  let center: { x: number; y: number; name: string; count: number } | null = null
  if (hub) {
    const members = works.filter(w => hub.keys.includes(w.key))
    const types = [...new Set(members.map(w => w.category || '未分类'))]
    // Re-layout the same photo nodes around a new collection root. Other photos
    // stay mounted for the return animation, but no longer belong to this graph.
    const largestBranch = Math.max(0, ...types.map(type => members.filter(w => (w.category || '未分类') === type).length))
    const rings = Math.max(1, Math.ceil(largestBranch / 5))
    const radius = 330 + (rings - 1) * 190
    width = radius * 2 + 250; height = radius * 2 + 230
    center = { x: width / 2, y: height / 2, name: hub.name, count: members.length }
    const root = center
    lines.length = 0
    types.forEach((type, i) => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / types.length
      const branch = { name: type, x: root.x + Math.cos(angle) * 190, y: root.y + Math.sin(angle) * 190, count: members.filter(w => (w.category || '未分类') === type).length }
      if (hub.kind === 'room') {
        branches.push(branch)
        lines.push({ id: `branch:${type}`, x1: root.x, y1: root.y, x2: branch.x, y2: branch.y })
      }
      const photos = members.filter(w => (w.category || '未分类') === type)
      photos.forEach((work, j) => {
        const ring = Math.floor(j / 5), count = Math.min(5, photos.length - ring * 5)
        const spread = Math.min(Math.PI * 1.25, Math.PI * 2 / Math.max(types.length, 2) * .82)
        const theta = hub.kind === 'group' ? -Math.PI / 2 + (j % 5) / count * Math.PI * 2 : angle + (count === 1 ? 0 : ((j % 5) / (count - 1) - .5) * spread)
        const distance = 330 + ring * 190
        const old = positions.get(work.key)!
        const p = { x: root.x + Math.cos(theta) * distance, y: root.y + Math.sin(theta) * distance, angle: old.angle }
        positions.set(work.key, p)
        lines.push({ id: `card:${work.key}`, x1: p.x, y1: p.y, x2: hub.kind === 'group' ? root.x : branch.x, y2: hub.kind === 'group' ? root.y : branch.y })
      })
    })
    works.filter(w => !hub.keys.includes(w.key)).forEach((work, i) => {
      const old = positions.get(work.key)!
      positions.set(work.key, { x: 50 + i * 135, y: height - 45, angle: old.angle })
    })
  }
  return { width, height, groups, positions, lines, ordered, branches, center }
}
