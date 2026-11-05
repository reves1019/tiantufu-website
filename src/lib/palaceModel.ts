import type { Crop, PalaceItem } from './community'
export interface PalaceWork { key: string; title: string; author: string; image: string; fullImage: string; category: string; topic: string; description: string; year?: string }
export function normalizeCrop(a: {x:number;y:number}, b: {x:number;y:number}): Crop | null {
  const clamp = (v: number) => Math.max(0, Math.min(1, v))
  const x=Math.min(clamp(a.x),clamp(b.x)), y=Math.min(clamp(a.y),clamp(b.y)), w=Math.abs(clamp(a.x)-clamp(b.x)), h=Math.abs(clamp(a.y)-clamp(b.y))
  return w>=.025 && h>=.025 ? {x,y,w,h} : null
}
export function recommendWorks(works: PalaceWork[], interests: string[], saved: PalaceItem[]) {
  const savedKeys=new Set(saved.map(i=>i.work_key)), savedCategories=new Set(works.filter(w=>savedKeys.has(w.key)).map(w=>w.category))
  return works.filter(w=>!savedKeys.has(w.key)).map(w=>({work:w,score:interests.includes(w.category)?4:savedCategories.has(w.category)?2:0,
    reason:interests.includes(w.category)?`你关注了「${w.category}」`:savedCategories.has(w.category)?'与你收藏的地图属于同一分类':'馆藏探索'})).sort((a,b)=>b.score-a.score||a.work.title.localeCompare(b.work.title,'zh-CN'))
}
