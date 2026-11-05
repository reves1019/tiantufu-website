import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Bookmark, Grid2X2, History, Minus, Plus, RotateCcw, ArrowUpRight } from 'lucide-react'
import type { PalaceWork } from '../../lib/palaceModel'
import { photoShelfLayout, mapYear, type ShelfMode, type ShelfHub } from '../../lib/photoShelfLayout'
import './photo-shelf.css'
import { useShelfCamera } from '../../lib/useShelfCamera'
import { MIN_SHELF_ZOOM, MAX_SHELF_ZOOM } from '../../lib/shelfCamera'

type Focus = { kind: 'work'; key: string }
type Props = {
  works: PalaceWork[]
  selectedKey?: string
  savedKeys: Set<string>
  onSelect: (work: PalaceWork) => void
  resetSequence?: number
  roomFocus?: { keys: string[]; name: string; sequence: number }
}

export default function PhotoShelf({ works, selectedKey, savedKeys, onSelect, roomFocus, resetSequence = 0 }: Props) {
  const [layout, setLayout] = useState<ShelfMode>('flat')
  const [focus, setFocus] = useState<Focus | null>(null)
  const [hub, setHub] = useState<ShelfHub | null>(null)
  const [size, setSize] = useState({ width: 1000, height: 560 })
  const viewport = useRef<HTMLDivElement>(null)
  const model = useMemo(() => photoShelfLayout(works, layout, hub), [works, layout, hub])
  useEffect(() => {
    if (!viewport.current) return
    const observer = new ResizeObserver(entries => { const box = entries[0].contentRect; setSize({ width: box.width, height: box.height }) })
    observer.observe(viewport.current)
    return () => observer.disconnect()
  }, [])
  const fit = Math.min(size.width / model.width, size.height / model.height, 1)
  let cx = model.width / 2, cy = model.height / 2, scale = fit
  let focusLabel = hub?.name ?? '全部展区'
  const focusedWork = focus?.kind === 'work' ? works.find(w => w.key === focus.key) : undefined
  if (focus && focusedWork) {
    const point = model.positions.get(focus.key)!
    cx = point.x; cy = point.y
    scale = Math.min(size.width / 145, size.height / 175, 4.5)
    focusLabel = focusedWork.title
  }
  const { zoom, pan, setZoom, setPan, interacting, resetCamera, bind } = useShelfCamera(viewport, { width: size.width, height: size.height, cx, cy, scale })
  useEffect(() => { if (resetSequence) { setHub(null); setFocus(null); resetCamera() } }, [resetSequence, resetCamera])
  useEffect(() => {
    if (roomFocus) { setHub({ kind: 'room', keys: roomFocus.keys, name: roomFocus.name }); setFocus(null); setLayout('flat'); resetCamera() }
    else { setHub(null); setFocus(null) }
  }, [roomFocus, resetCamera])
  scale *= zoom
  const reset = () => { setHub(null); setFocus(null); resetCamera() }
  const focusOn = (target: Focus) => { setFocus(target); resetCamera() }
  const openGroup = (name: string, keys: string[]) => { setHub({ kind: 'group', name, keys }); setLayout('flat'); setFocus(null); resetCamera() }
  const backToHub = () => { setFocus(null); resetCamera() }
  const switchLayout = (next: ShelfMode) => { setLayout(next); reset() }
  return <div className="photo-shelf clue-shelf">
    <div className="photo-shelf-tools">
      <div role="group" aria-label="照片架排列方式">
        <button aria-pressed={layout === 'flat'} onClick={() => switchLayout('flat')}><Grid2X2 size={14}/>平面照片架</button>
        <button aria-pressed={layout === 'time'} onClick={() => switchLayout('time')}><History size={14}/>年代时间带</button>
      </div>
      <span>滚轮 / 双指缩放 · 拖动漫游 · 双击复位</span>
    </div>
    <p className="photo-shelf-touch-hint">双指缩放 · 单指拖动 · 双击展区或左侧展室复位</p>
    <div className="clue-room-tabs" aria-label="制图类型展区" onDoubleClick={event => { event.preventDefault(); reset() }}>
      <button aria-pressed={!focus && !hub} onClick={reset}>全部展区</button>
      {model.groups.map(group => <button key={group.name} aria-pressed={hub?.kind === 'group' && hub.name === group.name} onClick={() => openGroup(group.name, group.keys)}>{group.name} <small>{group.keys.length}</small></button>)}
    </div>
    <div ref={viewport} className={`clue-viewport${interacting ? ' is-interacting' : ''}`} tabIndex={0} role="region" aria-label="地图线索画布" data-layout={layout} data-hub={hub?.name}
      onDoubleClick={event => { event.preventDefault(); reset() }}
      onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'Escape') reset(); const delta = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] }[event.key]; if (delta) { event.preventDefault(); setPan(p => ({ x: p.x + delta[0], y: p.y + delta[1] })) } }}
      {...bind}>
      <div className="clue-grid" aria-hidden="true"/>
      <div className="clue-world" style={{ width: model.width, height: model.height, transform: `translate(${size.width / 2 + pan.x}px, ${size.height / 2 + pan.y}px) scale(${scale}) translate(${-cx}px, ${-cy}px)` }}>
        <svg className="clue-connections" width={model.width} height={model.height} aria-hidden="true">
          {model.lines.map(line => <path key={line.id} className={line.id.startsWith('group:') ? 'clue-group-line' : ''} style={{ opacity: layout === 'time' && line.id.startsWith('group:') ? 0 : 1 }} d={`M${line.x1} ${line.y1} L${line.x2} ${line.y2}`}/>)}
          <path className="clue-time-axis" style={{ opacity: layout === 'time' && !hub ? 1 : 0 }} d={`M65 310 L${model.width - 40} 310`}/>
        </svg>
        {model.groups.map((group, i) => <div key={group.name} className="clue-group" style={{ left: group.x, top: group.y, width: group.width, height: group.height, opacity: layout === 'flat' && !hub ? 1 : 0, visibility: hub ? 'hidden' : 'visible', pointerEvents: layout === 'flat' && !hub ? 'auto' : 'none' }}>
          <button tabIndex={layout === 'flat' && !hub ? 0 : -1} aria-hidden={layout !== 'flat' || !!hub} aria-label={`放大${group.name}展区`} onClick={() => openGroup(group.name, group.keys)}><span>{String(i + 1).padStart(2, '0')} / 制图展室</span><strong>{group.name}</strong><small>{group.keys.length} 幅地图 ↗</small></button>
        </div>)}
        {model.center && <div className="clue-collection-root" data-testid="collection-root" style={{ left: model.center.x, top: model.center.y }}><span>{hub?.kind === 'room' ? '我的收藏室' : '制图展室'}</span><strong>{model.center.name}</strong><small>{model.center.count ? model.center.count+' 幅地图 · 按图类展开' : '尚无可展示的收藏'}</small>{!model.center.count && <button onClick={reset}>去全站挑选地图 ↗</button>}</div>}
        {model.branches.map(branch => <div key={branch.name} className="clue-collection-branch" style={{ left: branch.x, top: branch.y }}><strong>{branch.name}</strong><small>{branch.count} 幅</small></div>)}
        {works.map((work, index) => {
          const point = model.positions.get(work.key)!
          return <div key={work.key} className="clue-photo-node" data-work-key={work.key} data-in-room={hub ? hub.keys.includes(work.key) : undefined} data-year={mapYear(work.year) ?? 'unknown'} style={{ transform: `translate(${point.x}px, ${point.y}px)`, zIndex: focusedWork?.key === work.key ? 5 : 2, opacity: hub && !hub.keys.includes(work.key) ? 0 : 1, pointerEvents: hub && !hub.keys.includes(work.key) ? 'none' : 'auto' }}>
            <button className="photo-shelf-card" data-focused={focusedWork?.key === work.key} tabIndex={hub && !hub.keys.includes(work.key) ? -1 : 0} aria-hidden={hub && !hub.keys.includes(work.key) ? true : undefined} aria-label={`查看地图：${work.title}`} aria-pressed={focusedWork?.key === work.key || selectedKey === work.key} style={{ '--clue-angle': `${focusedWork?.key === work.key ? 0 : point.angle}deg` } as CSSProperties}
              draggable onDragStart={event => { event.dataTransfer.setData('text/plain', work.key); event.dataTransfer.effectAllowed = 'copy' }} onClick={() => focusOn({ kind: 'work', key: work.key })}>
              <span className="photo-shelf-card-top"><span>TTF / {String(index + 1).padStart(2, '0')}</span>{savedKeys.has(work.key) ? <Bookmark size={10} fill="currentColor"/> : <span>↗</span>}</span>
              <span className="photo-shelf-image"><img src={work.image} alt={work.title} loading="lazy" draggable={false}/></span>
              <span className="photo-shelf-caption"><strong>{work.title}</strong><small>{work.author} · {work.category}</small></span>
            </button>
            <span className="clue-year" style={{ opacity: layout === 'time' ? 1 : 0, transform: `translate(-50%, ${310 - point.y}px)` }}>{mapYear(work.year) === null ? '年代未标注' : work.year}</span>
          </div>
        })}
      </div>
      {!works.length && !hub && <p className="clue-empty">没有符合条件的地图，试试其他分类或关键词。</p>}
      <div className="clue-caption">{hub ? '以收藏室为中心 / 图类与收藏重新连接' : layout === 'flat' ? '按制图类型相连 / 点击展室重排节点' : '按明确年代排序 / 未标注年代置于末尾'}</div>
    </div>
    <footer className="photo-shelf-footer"><span aria-live="polite">{focusLabel} · {Math.round(scale / fit * 100)}%</span><div className="clue-focus-actions">{focusedWork && <button className="clue-open-work" onClick={() => onSelect(focusedWork)}>收藏与摘记 <ArrowUpRight size={14}/></button>}{focus && hub && <button onClick={backToHub}>返回收藏室</button>}{(focus || hub) && <button onClick={reset}>返回全景</button>}</div><div className="photo-shelf-zoom"><button aria-label="缩小照片架" disabled={zoom <= MIN_SHELF_ZOOM} onClick={() => setZoom(z => Math.max(MIN_SHELF_ZOOM, z / 1.25))}><Minus size={14}/></button><button aria-label="放大照片架" disabled={zoom >= MAX_SHELF_ZOOM} onClick={() => setZoom(z => Math.min(MAX_SHELF_ZOOM, z * 1.25))}><Plus size={14}/></button><button aria-label="重置照片架视角" onClick={reset}><RotateCcw size={14}/></button></div></footer>
  </div>
}
