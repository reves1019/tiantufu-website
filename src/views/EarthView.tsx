import { useState } from 'react'
import CodeSphere from '../components/CodeSphere'
import KeywordDock from '../components/KeywordDock'
import KeywordSpotlight from '../components/KeywordSpotlight'
import KeywordAdminPanel from '../components/admin/KeywordAdminPanel'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { WORK_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'

export default function EarthView() {
  const { content, admin } = useContent()
  const earth = content.earth
  const [activeKeyword, setActiveKeyword] = useState(earth.keywords[0] ?? '')
  const [focused, setFocused] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const activeIndex = earth.keywords.indexOf(activeKeyword)

  const handleSphereClick = () => {
    if (content.members.length === 0) return
    requestScene(WORK_INDEX)
  }

  return (
    <section id="earth" className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 mx-auto grid w-full max-w-[1700px] items-center gap-10 px-8 py-12 lg:grid-cols-[1fr_1.2fr] lg:px-12">
        {/* 左侧文案 */}
        <div>
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">{earth.title} · 关键词索引</p>
          <EditableText
            as="h1"
            value={earth.subtitle}
            path="earth.subtitle"
            className="scene-block mt-4 w-full font-display text-5xl leading-tight tracking-[0.12em] text-parchment-100 lg:text-6xl"
          />
          <p className="scene-block mt-4 max-w-xl text-sm leading-relaxed text-parchment-300">
            悬停右侧关键词目录，指南针星核会同步回应，并在数码地球旁浮现对应内容。
            此处为占位内容，后续替换为正式说明。
          </p>

          {/* 移动端：横向滚动的关键词条（PC 使用右侧关键词目录） */}
          <div className="scene-block mt-6 flex max-w-xl gap-2 overflow-x-auto pb-2 md:hidden">
            {earth.keywords.map((keyword, i) => {
              const active = activeKeyword === keyword
              return (
                <button
                  key={keyword}
                  type="button"
                  onMouseEnter={() => setActiveKeyword(keyword)}
                  onClick={() => setActiveKeyword(keyword)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-xs tracking-[0.12em] transition-all duration-300 ${
                    active
                      ? 'border-brand-500/70 bg-brand-500/15 text-brand-400 shadow-[0_0_16px_rgba(199,27,27,0.4)]'
                      : 'border-white/10 text-parchment-500 hover:border-brand-500/40 hover:text-brand-400'
                  }`}
                >
                  <span className="mr-1.5 text-[10px] opacity-70">#{String(i + 1).padStart(2, '0')}</span>
                  {keyword}
                </button>
              )
            })}
          </div>
        </div>

        {/* 右侧代码地球（交互式：点击随机发现作品） */}
        <div>
          <div
            className="earth-sphere relative mx-auto aspect-square w-full max-w-[660px] cursor-pointer"
            onClick={handleSphereClick}
          >
            <div className="absolute inset-0">
              <CodeSphere intensity={focused ? 1 : 0} />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-3xl" />
            {/* 关键词浮层（跟随悬停/选中的关键词） */}
            <KeywordSpotlight
              key={activeKeyword}
              keyword={activeKeyword}
              index={activeIndex}
              visible={focused || dockOpen}
            />
          </div>
          <p className="mt-4 text-center font-mono text-[10px] tracking-[0.3em] text-parchment-500">
            点击地球 · 随机发现一位作者的作品
          </p>
        </div>
      </div>

      {/* 右侧关键词侧边标签栏（PC） */}
      <KeywordDock
        keywords={earth.keywords}
        activeKeyword={activeKeyword}
        onSelect={setActiveKeyword}
        onFocusChange={setFocused}
        onOpenChange={setDockOpen}
      />

      {/* 管理员：关键词列表编辑面板 */}
      {admin && <KeywordAdminPanel />}
    </section>
  )
}
