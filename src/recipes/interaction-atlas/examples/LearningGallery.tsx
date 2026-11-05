import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { TabsExample } from './TabsExample'
import { PosterExample } from './PosterExample'
import { StripExample } from './StripExample'
import { ScratchExample } from './ScratchExample'
import { ReactionExample } from './ReactionExample'
import { FlowExample } from './FlowExample'
import { cards } from './data'
import tabsSource from '../ShaderTabs.tsx?raw'
import posterSource from '../SilkPoster.tsx?raw'
import stripSource from '../ExpandingStrip.tsx?raw'
import scratchSource from '../ScratchCard.tsx?raw'
import reactionSource from '../ReactionBar.tsx?raw'
import flowSource from '../ImageFlow.tsx?raw'
import tabsExample from './TabsExample.tsx?raw'
import posterExample from './PosterExample.tsx?raw'
import stripExample from './StripExample.tsx?raw'
import scratchExample from './ScratchExample.tsx?raw'
import reactionExample from './ReactionExample.tsx?raw'
import flowExample from './FlowExample.tsx?raw'
import './learning.css'

const lessons = [
  { id: 'tabs', title: '分类标签', principle: '选择状态 → 语义标签 → 材质颜色', source: tabsSource, example: tabsExample, exercise: '锁定父级选择，再切换标签，观察请求与实际状态的区别。' },
  { id: 'poster', title: '丝绸海报', principle: '指针比例 → 两轴倾角 → CSS 变量', source: posterSource, example: posterExample, exercise: '沿海报边缘移动鼠标，再开启减少动态，观察按钮功能仍然可用。' },
  { id: 'strip', title: '伸缩卡带', principle: '临时预览 + 确认选择 → 空间分配', source: stripSource, example: stripExample, exercise: '悬停另一张卡片，观察下方已确认值；点击后再把指针移开。' },
  { id: 'scratch', title: '刮刮卡', principle: '坐标换算 → 擦除覆盖层 → 面积阈值', source: scratchSource, example: scratchExample, exercise: '把阈值改为 10%，刮开后换图，检查覆盖层是否重建。' },
  { id: 'reactions', title: '表情反应', principle: 'null / id → 选择与取消 → 状态反馈', source: reactionSource, example: reactionExample, exercise: '重复点击同一项，再用方向键和 Enter 操作，比较两种输入。' },
  { id: 'flow', title: '流式轮播', principle: '滑动意图 → 循环索引 → 当前作品', source: flowSource, example: flowExample, exercise: '用下一张、方向键和横滑切图，再清空列表，观察按钮和空态。' },
]

function Lesson({ lesson, index, children }: { lesson: typeof lessons[number]; index: number; children: ReactNode }) {
  return <section id={lesson.id} className="learning-lesson" aria-labelledby={`${lesson.id}-title`}>
    <header><span className="learning-number">0{index + 1}</span><div><h2 id={`${lesson.id}-title`}>{lesson.title}</h2><p>{lesson.principle}</p></div></header>
    <div className="learning-demo">{children}</div>
    <p className="learning-exercise"><strong>动手试试</strong> {lesson.exercise}</p>
    <details><summary>最小接入示例</summary><pre tabIndex={0}><code>{lesson.example}</code></pre></details>
    <details><summary>阅读带注释的组件源码</summary><pre tabIndex={0}><code>{lesson.source}</code></pre></details>
  </section>
}

export function LearningGallery() {
  const [reduced, setReduced] = useState(false)
  const [count, setCount] = useState(cards.length)
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    const previous = document.documentElement.dataset.motion
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'system'
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.motion
      else document.documentElement.dataset.motion = previous
    }
  }, [reduced])
  const items = cards.slice(0, count)
  const demos = [
    <TabsExample key="tabs" items={items} />, <PosterExample key="poster" />, <StripExample key="strip" items={items} />,
    <ScratchExample key="scratch" />, <ReactionExample key="reactions" />, <FlowExample key="flow" items={items} />,
  ]
  return <main className="learning-root">
    <header className="learning-hero">
      <p className="learning-eyebrow">TIANTUFU / INTERACTION NOTEBOOK</p>
      <h1>交互代码学习库<span>六种交互，从状态到画面。</span></h1>
      <p>先操作，再看状态，最后展开源码。这里与网站共用同一套组件；练习只保留本页状态，刷新即可重来。</p>
      <nav aria-label="课程目录">{lessons.map((lesson, index) => <a key={lesson.id} href={`#${lesson.id}`}>0{index + 1} {lesson.title}</a>)}</nav>
    </header>
    <div className="learning-toolbar">
      <label><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />减少动态（同时遵守系统设置）</label>
      <button type="button" onClick={() => setCount(count === 0 ? cards.length : 0)}>{count === 0 ? '恢复列表' : '清空列表'}</button>
      <button type="button" disabled={count === 0} onClick={() => setCount(current => Math.max(0, current - 1))}>移除末项</button>
      <button type="button" onClick={() => { setCount(cards.length); setGeneration(current => current + 1) }}>复位所有练习</button>
    </div>
    <p className="learning-note">列表操作影响标签、卡带、轮播。图像均为原创几何示意图，不代表真实地理信息。完整课程与迁移说明见项目 learning/interaction-atlas/README.md。</p>
    <div key={generation}>{lessons.map((lesson, index) => <Lesson key={lesson.id} lesson={lesson} index={index}>{demos[index]}</Lesson>)}</div>
    <footer>React + TypeScript + CSS + Canvas · 无新增运行时依赖 · 无账号、数据库与持久化写入</footer>
  </main>
}
