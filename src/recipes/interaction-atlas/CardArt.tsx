import type { AtlasCard } from './types'

/** 装饰层不承载信息，语义内容始终由 img 与标题提供。 */
export function CardArt({ item }: { item: AtlasCard }) {
  return <>
    <div className="atlas-fabric" aria-hidden="true" />
    <img className="atlas-lab-image" src={item.image} alt={item.alt} loading="lazy" draggable={false} />
    <div className="atlas-card-copy">
      <small>{item.author ? `制图 / ${item.author}` : 'TIANTUFU / ATLAS'}</small>
      <h3>{item.title}</h3>
      {item.description && <p>{item.description}</p>}
    </div>
  </>
}
