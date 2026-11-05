import { useId } from 'react'
import type { ReactNode } from 'react'
import type { SelectionProps } from './types'
import { useSelection } from './useSelection'
import { moveFocus, tint } from './dom'
import { CardArt } from './CardArt'
import './styles.css'

export interface ShaderTabsProps extends SelectionProps { panelContent?: ReactNode }

/** 名称沿用旧 API；材质来自 CSS 渐变叠加，并非 WebGL shader。 */
export function ShaderTabs({ items, value, onChange, label = '地图分类', panelContent }: ShaderTabsProps) {
  const { selected, choose } = useSelection(items, value, onChange)
  const id = useId()
  if (!selected) return <p>暂无地图</p>

  return <div className="atlas-tabs">
    <div role="tablist" aria-label={label}>
      {items.map((item, index) => <button
        type="button"
        key={item.id}
        id={`${id}-tab-${index}`}
        role="tab"
        aria-selected={selected.id === item.id}
        aria-controls={`${id}-panel`}
        tabIndex={selected.id === item.id ? 0 : -1}
        onClick={() => choose(item.id)}
        onKeyDown={event => moveFocus(event, index, items.length, next => choose(items[next].id))}
      >{item.title}</button>)}
    </div>
    <div
      className={`atlas-art atlas-tab-panel${panelContent !== undefined ? ' atlas-tab-panel--content' : ''}`}
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={`${id}-tab-${items.indexOf(selected)}`}
      tabIndex={0}
      style={tint(selected.color)}
    >
      {panelContent !== undefined
        ? <><div className="atlas-fabric" aria-hidden="true" /><div className="atlas-panel-reading">{panelContent}</div></>
        : <CardArt item={selected} />}
    </div>
  </div>
}
