import { useMemo, useRef, useState } from 'react'
import { useContent } from '../lib/contentStore'
import { defaultOptions, defaultPageMotion, motionRecipes, normalizePageMotion } from '../recipes/design-motion/model'
import type { ButtonId, EffectCategory, MotionOptions, PageMotionSettings, ScrollId, TextId, TransitionId } from '../recipes/design-motion/model'
import { motionSources } from '../recipes/design-motion/sources'
import { TransitionStage } from '../recipes/design-motion/TransitionStage'
import { MotionText } from '../recipes/design-motion/MotionText'
import { MotionButton } from '../recipes/design-motion/MotionButton'
import { ScrollScene } from '../recipes/design-motion/ScrollScene'
import { exampleSource, makeSourceZip, sourceFiles } from '../recipes/design-motion/exportKit'
import '../design-studio.css'

const categories: Array<{ id: EffectCategory | 'all'; label: string }> = [
  { id: 'all', label: '全部' }, { id: 'transition', label: '页面转场' }, { id: 'text', label: '文字' },
  { id: 'button', label: '按钮' }, { id: 'scroll', label: '滚动' },
]

export default function DesignStudioView() {
  const { admin, openGate, content, setAt, hydrated, cloudMode, cloudSyncState, saveState } = useContent()
  const [category, setCategory] = useState<EffectCategory | 'all'>('all')
  const [source, setSource] = useState('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(motionRecipes[0].id)
  const [options, setOptions] = useState<MotionOptions>({ ...defaultOptions })
  const [title, setTitle] = useState('以图为引，寻见山河。')
  const [replay, setReplay] = useState(0)
  const [reduced, setReduced] = useState(false)
  const [message, setMessage] = useState('')
  const [clicks, setClicks] = useState(0)
  const [previous, setPrevious] = useState<PageMotionSettings | null>(null)
  const codeRef = useRef<HTMLTextAreaElement>(null)
  const recipe = motionRecipes.find(item => item.id === selected) ?? motionRecipes[0]
  const current = normalizePageMotion(content.designMotion)
  const writable = admin && hydrated && (!cloudMode || cloudSyncState === 'ready')
  const filtered = motionRecipes.filter(item => (category === 'all' || item.category === category)
    && (source === 'all' || item.sourceIds.includes(source))
    && `${item.title} ${item.summary} ${item.useFor}`.includes(query.trim()))
  const snippet = useMemo(() => exampleSource(recipe, options, title), [recipe, options, title])
  const change = <K extends keyof MotionOptions>(key: K, value: MotionOptions[K]) => setOptions(previous => ({ ...previous, [key]: value }))

  const apply = (next: PageMotionSettings) => {
    if (!writable) return
    setPrevious(current)
    setAt('designMotion', normalizePageMotion(next))
    setMessage('转场已应用。保存进度见下方状态；切换页面即可查看。')
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setMessage('已复制接入代码。组件文件可从源码包取得。') }
    catch { codeRef.current?.focus(); codeRef.current?.select(); setMessage('已选中代码，请按 Ctrl+C 复制。') }
  }
  const download = () => {
    const blob = makeSourceZip(sourceFiles(recipe, options, title))
    const url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = `tiantufu-motion-${recipe.id}.zip`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('已导出当前效果的完整 React 示例包。')
  }

  if (!admin) return <section id="design-studio" data-scroll-root className="design-studio">
    <div className="ds-locked"><p className="ds-kicker">TIANTUFU / DESIGN STUDIO</p><h1>动效制作</h1><p>管理员登录后，可预览、调整和应用网站动效。</p><button type="button" onClick={openGate}>登录管理员账号</button><a href="#home">返回首页</a></div>
  </section>

  return <section id="design-studio" data-scroll-root className="design-studio">
    <header className="ds-header">
      <div><p className="ds-kicker">TIANTUFU / DESIGN STUDIO</p><h1>让切换，有章可循<span>。</span></h1><p>从参考到可复用的交互。选择一项，调整节奏，再装进页面。</p></div>
      <a href="#home">返回网站 ↗</a>
    </header>
    <div className="ds-summary"><span><strong>{motionRecipes.length}</strong> 个可用效果</span><span><strong>{motionSources.length}</strong> 个参考来源</span><a href="#lab">交互图鉴 ↗</a><a href="/learning/interaction-atlas/index.html" target="_blank" rel="noreferrer">学习库 ↗</a></div>
    <div className="ds-layout">
      <aside className="ds-library" aria-label="效果库">
        <div className="ds-filter"><label>查找效果<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="转场、文字、作品…" /></label><label>参考来源<select value={source} onChange={event => setSource(event.target.value)}><option value="all">全部来源</option>{motionSources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <div className="ds-categories" role="group" aria-label="效果类型">{categories.map(item => <button key={item.id} type="button" aria-pressed={item.id === category} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
        <p className="ds-count" role="status">找到 {filtered.length} 项效果</p>
        <div className="ds-recipes">{filtered.map(item => <button key={item.id} type="button" className="ds-recipe" aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setReplay(value => value + 1); setMessage('') }}>
          <small>{categories.find(category => category.id === item.category)?.label}</small><strong>{item.title}<span aria-hidden="true">↗</span></strong><p>{item.summary}</p>
        </button>)}</div>
        {!filtered.length && <p className="ds-empty">没有匹配的效果，换一个筛选条件试试。</p>}
      </aside>
      <div className="ds-workbench">
        <section className="ds-preview" aria-labelledby="ds-preview-title">
          <header><div><p className="ds-kicker">LIVE PREVIEW</p><h2 id="ds-preview-title">{recipe.title}</h2></div><button type="button" onClick={() => setReplay(value => value + 1)}>重播 ↻</button></header>
          <div className={`ds-preview-area ds-preview-${recipe.category}`} data-testid="motion-preview" data-effect={recipe.id}>
            {recipe.category === 'transition' && <TransitionStage variant={recipe.id as TransitionId} options={options} replay={replay} reduced={reduced} />}
            {recipe.category === 'text' && <MotionText variant={recipe.id as TextId} options={options} text={title} replay={replay} reduced={reduced} />}
            {recipe.category === 'button' && <><MotionButton variant={recipe.id as ButtonId} options={options} reduced={reduced} onClick={() => setClicks(value => value + 1)}>{title || '探索作品'}</MotionButton><p role="status">已触发 {clicks} 次 · 预览操作</p></>}
            {recipe.category === 'scroll' && <ScrollScene variant={recipe.id as ScrollId} options={options} replay={replay} reduced={reduced} />}
          </div>
          <label className="ds-reduce"><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />预览减少动态（同时遵守系统设置）</label>
          <p className="ds-use">适合：{recipe.useFor}</p>
        </section>
        <section className="ds-parameters" aria-label="预览参数">
          <h3>调整节奏</h3><div className="ds-sliders">
            <label>时长 <output>{options.duration} ms</output><input aria-label="动效时长" type="range" min="160" max="1600" step="20" value={options.duration} onChange={event => change('duration', Number(event.target.value))} /></label>
            <label>位移 <output>{options.distance} px</output><input aria-label="动效位移" type="range" min="0" max="100" value={options.distance} onChange={event => change('distance', Number(event.target.value))} disabled={['fade', 'curtain', 'iris', 'fill', 'sheen', 'scramble'].includes(recipe.id)} /></label>
            <label>错峰 <output>{options.stagger} ms</output><input aria-label="文字错峰" type="range" min="0" max="150" step="5" value={options.stagger} onChange={event => change('stagger', Number(event.target.value))} disabled={recipe.id !== 'split' && recipe.id !== 'blur'} /></label>
            <label>强调色<input aria-label="动效强调色" type="color" value={options.color} onChange={event => change('color', event.target.value)} /></label>
          </div>
          {(recipe.category === 'text' || recipe.category === 'button') && <label className="ds-title-input">预览文字<input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} /></label>}
          <button type="button" onClick={() => { setOptions({ ...defaultOptions }); setReplay(value => value + 1) }}>复位预览参数</button>
        </section>
        <section className="ds-apply" aria-label="全站页面转场">
          <h3>全站页面转场</h3>
          <p>当前：<strong data-testid="applied-transition">{current.preset === 'original' ? '原有转场' : motionRecipes.find(item => item.id === current.preset)?.title}</strong> · {current.duration} ms</p>
          {recipe.category === 'transition'
            ? <button type="button" className="ds-primary" disabled={!writable} onClick={() => apply({ preset: recipe.id as TransitionId, duration: options.duration, distance: options.distance })}>应用此页面转场</button>
            : <p className="ds-muted">文字、按钮与滚动效果通过下方组件代码接入所需位置。</p>}
          <div className="ds-apply-actions"><button type="button" disabled={!writable || !previous} onClick={() => { if (!writable || !previous) return; setAt('designMotion', previous); setPrevious(null); setMessage('已撤销本次应用。') }}>撤销上次应用</button><button type="button" disabled={!writable} onClick={() => apply(defaultPageMotion)}>恢复原有转场</button><a href="#about">到社团介绍试用 ↗</a></div>
          <p className="ds-save" role="status">{!writable ? '等待内容就绪或云端同步完成后，可应用设置。' : saveState === 'error' ? '保存失败，请从管理员工具栏查看详情。' : saveState === 'saving' ? '正在保存…' : saveState === 'saved' ? cloudMode ? '云端已保存' : '本机已保存' : '设置已就绪'}</p>
        </section>
        <section className="ds-code" aria-labelledby="ds-code-title"><header><h3 id="ds-code-title">带回你的页面</h3><div><button type="button" onClick={() => void copy()}>复制接入代码</button><button type="button" onClick={download}>下载完整源码包</button></div></header><p>包含当前参数、组件、样式、可运行入口和来源说明。</p><textarea ref={codeRef} aria-label="React 接入代码" value={snippet} readOnly spellCheck={false} /></section>
        <p className="ds-message" role="status">{message}</p>
        <details className="ds-sources"><summary>设计原理与来源</summary><p>{recipe.principle}</p><p>当前组件均为独立重写。展示站提供效果参考；具体组件站的原许可见下方记录。</p>
          {recipe.sourceIds.length ? motionSources.filter(item => recipe.sourceIds.includes(item.id)).map(item => <article key={item.id}><h4><a href={item.exampleUrl} target="_blank" rel="noreferrer">{item.name} ↗</a></h4><p>{item.evidence}</p><p>{item.reuse}</p><small>核对日期：{item.verifiedOn}</small></article>) : <p>此项是学习库的原创补充变体。</p>}
        </details>
      </div>
    </div>
    <details className="ds-source-directory"><summary>查看全部 {motionSources.length} 个参考来源</summary><div>{motionSources.map(item => <article key={item.id}><a href={item.url} target="_blank" rel="noreferrer">{item.name} ↗</a><p>{item.focus}</p><a href={item.exampleUrl} target="_blank" rel="noreferrer">查看参考实例</a><p>{item.evidence}</p><small>{item.reuse}</small></article>)}</div></details>
  </section>
}
