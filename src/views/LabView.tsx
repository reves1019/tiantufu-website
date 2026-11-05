import { useMemo, useState } from 'react'
import { useContent } from '../lib/contentStore'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { ShaderTabs, SilkPoster, ExpandingStrip, ScratchCard, ReactionBar, ImageFlow } from '../components/lab/AtlasInteractions'
import type { AtlasCard } from '../components/lab/AtlasInteractions'

const colors = ['#664936', '#334e45', '#693a37', '#454566', '#69613b']
const sections = ['山河之间', '一纸来信', '展开疆域', '拂去金箔', '此刻共鸣', '流动图册']
const reactions = [
  { id: 'like', label: '赞赏', symbol: '♡', color: '#a34436' },
  { id: 'inspire', label: '启发', symbol: '✧', color: '#8b7139' },
  { id: 'explore', label: '想探索', symbol: '⌖', color: '#436153' },
  { id: 'wonder', label: '惊叹', symbol: '✺', color: '#615077' },
  { id: 'study', label: '想学习', symbol: '◎', color: '#3e6472' },
]

export default function LabView() {
  const { content } = useContent()
  const [reaction, setReaction] = useState<string | null>(null)
  const cards = useMemo<AtlasCard[]>(() => exhibitionCatalog(content.worksArchive, content.members, content.ui.member.representative).slice(0, 5).map(({ work }, index) => ({ id: work.id, title: work.title, image: work.image, alt: `${work.title}，制图：${work.author}`, author: work.author, description: work.desc, color: colors[index % colors.length] })), [content])
  const jump = (index: number) => document.getElementById(`lab-section-${index}`)?.scrollIntoView({ block: 'start' })
  return <section id="lab" data-scroll-root className="atlas-lab"><div className="atlas-lab-inner"><header className="atlas-lab-header"><small>TIANTUFU / INTERACTION ATLAS · 06 STUDIES</small><h1>交互图鉴实验室<span aria-hidden="true"> ↗</span></h1><p>让地图拥有另一种阅读方式。展开、轻触、揭晓，在纸张与山河之间，试着发现一个新的入口。</p><a href="#home">← 返回天图府</a><nav className="atlas-lab-nav" aria-label="实验导航">{sections.map((title, index) => <button type="button" key={title} onClick={() => jump(index)}>{String(index + 1).padStart(2, '0')} / {title}</button>)}</nav></header>
    {cards.length ? <>
      <section id="lab-section-0" className="atlas-lab-section"><header><h2><small>01 / </small>山河之间</h2><p>切换作品 · 方向键浏览</p></header><ShaderTabs items={cards} /></section>
      <div className="atlas-lab-pair"><section id="lab-section-1" className="atlas-lab-section"><header><h2><small>02 / </small>一纸来信</h2><p>指针轻移 · 纸面随光</p></header><SilkPoster item={cards[0]} /></section><section id="lab-section-3" className="atlas-lab-section"><header><h2><small>04 / </small>拂去金箔</h2><p>拖动揭晓 · 再次覆盖</p></header><ScratchCard key={cards[0].id} item={cards[0]} /></section></div>
      <section id="lab-section-2" className="atlas-lab-section"><header><h2><small>03 / </small>展开疆域</h2><p>悬停展开 · 点击留驻 · 手机横滑</p></header><ExpandingStrip items={cards} /></section>
      <section id="lab-section-4" className="atlas-lab-section"><header><h2><small>05 / </small>此刻共鸣</h2><p>交互演示 · 不计入作品点赞</p></header><ReactionBar items={reactions} value={reaction} onChange={setReaction} /></section>
      <section id="lab-section-5" className="atlas-lab-section"><header><h2><small>06 / </small>流动图册</h2><p>点击选择 · 左右轻扫</p></header><ImageFlow items={cards} /></section>
    </> : <p>当前暂无公开作品，请在内容管理中添加公开地图后再来浏览。</p>}
  </div></section>
}
