import { useEffect, useState, type ReactNode } from 'react'
import type { Member, WorkItem } from '../../config/site'
import { useContent } from '../../lib/contentStore'
import ImageField from './ImageField'

/* ---------- 通用表单小组件 ---------- */

function Label({ children }: { children: ReactNode }) {
  return <span className="block font-mono text-[9px] tracking-[0.25em] text-parchment-500">{children}</span>
}

function TextField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
}) {
  const cls =
    'mt-1 w-full rounded border border-white/10 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none transition-colors focus:border-brand-500'
  return (
    <label className="block">
      <Label>{label}</Label>
      {textarea ? (
        <textarea value={value} rows={2} onChange={(event) => onChange(event.target.value)} className={`${cls} resize-y leading-relaxed`} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={cls} />
      )}
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded border border-white/10 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none transition-colors focus:border-brand-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function RowActions({ index, total, onUp, onDown, onDelete }: { index: number; total: number; onUp: () => void; onDown: () => void; onDelete: () => void }) {
  const btn =
    'rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-parchment-400 transition-colors hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-30'
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={onUp} disabled={index === 0} className={btn} title="上移">
        ↑
      </button>
      <button type="button" onClick={onDown} disabled={index === total - 1} className={btn} title="下移">
        ↓
      </button>
      <button type="button" onClick={onDelete} className={`${btn} text-brand-400`} title="删除">
        ×
      </button>
    </div>
  )
}

/* ---------- 主面板 ---------- */

const TABS = [
  { id: 'members', label: '成员' },
  { id: 'works', label: '作品档案' },
  { id: 'news', label: '新闻' },
  { id: 'culture', label: '文化' },
  { id: 'annals', label: '年鉴' },
  { id: 'faq', label: 'FAQ' },
  { id: 'topics', label: '创作主题' },
  { id: 'categories', label: '作品分类' },
  { id: 'commission', label: '约稿价格' },
] as const

type TabId = (typeof TABS)[number]['id']

/** 内容管理：管理员可增删改成员、作品档案、新闻、文化、年鉴、FAQ、主题、分类与约稿价格 */
export default function ContentManager() {
  const { content, admin, updateList, setAt } = useContent()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('members')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('ttf-content-manager-open', onOpen)
    return () => window.removeEventListener('ttf-content-manager-open', onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!admin || !open) return null

  const toggleExpanded = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const move = <T,>(path: string, list: T[], index: number, dir: -1 | 1) => {
    const next = [...list]
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    updateList(path, next)
  }

  const removeItem = <T,>(path: string, list: T[], index: number, label = '该项') => {
    if (window.confirm(`确定删除${label}？`)) updateList(path, list.filter((_, i) => i !== index))
  }

  const addItem = <T,>(path: string, list: T[], item: T) => {
    updateList(path, [...list, item])
  }

  const members = content.members
  const works = content.worksArchive
  const topics = content.topics
  const categories = content.worksCategories

  const blankMember = (): Member => ({
    id: `m-${Date.now()}`,
    name: '新成员（占位）',
    role: '制图师 · 占位',
    topic: topics[0]?.id ?? 'zhengshi',
    avatar: members[0]?.avatar ?? '',
    bio: '成员简介占位',
    tags: ['占位标签'],
    work: { title: '新作品（占位）', image: members[0]?.work.image ?? '', desc: '作品说明占位' },
    works: [],
  })

  const blankWork = (): WorkItem => ({
    id: `w-${Date.now()}`,
    title: '新作品（占位）',
    author: members[0]?.name ?? '',
    image: members[0]?.work.image ?? '',
    desc: '作品说明占位',
    topic: topics[0]?.id ?? 'zhengshi',
    category: categories[0] ?? '历史地图',
    year: '20XX',
  })

  const inputCls = 'rounded border border-white/10 bg-ink-950 px-2 py-1.5 text-xs text-parchment-100 outline-none transition-colors focus:border-brand-500'

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="内容管理"
    >
      <div className="flex h-[min(760px,90vh)] w-[min(1180px,96vw)] overflow-hidden rounded-2xl border border-brand-500/30 bg-ink-900/95 shadow-[0_0_80px_rgba(199,27,27,0.25)] backdrop-blur-xl">
        {/* 左侧页签 */}
        <div className="flex w-44 shrink-0 flex-col border-r border-white/10 bg-ink-950/60 p-3">
          <p className="px-2 pb-3 font-mono text-[10px] tracking-[0.4em] text-brand-400">CONTENT · 内容管理</p>
          <div className="flex flex-col gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-md px-3 py-2 text-left font-mono text-xs tracking-[0.2em] transition-colors ${
                  tab === item.id ? 'bg-brand-500/15 text-brand-400' : 'text-parchment-300 hover:bg-white/5 hover:text-parchment-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-auto rounded-md border border-white/10 px-3 py-2 font-mono text-xs tracking-[0.25em] text-parchment-300 transition-colors hover:border-brand-500/50 hover:text-brand-400"
          >
            关闭面板
          </button>
        </div>

        {/* 右侧编辑区 */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {/* 成员 */}
          {tab === 'members' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">MEMBERS · 成员 {members.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('members', members, blankMember())}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增成员
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {members.map((member, i) => {
                  const isOpen = expanded.has(i)
                  const tagsText = (member.tags ?? []).join(',')
                  return (
                    <div key={member.id} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleExpanded(i)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm tracking-[0.12em] text-parchment-100">{member.name}</p>
                          <p className="truncate font-mono text-[10px] tracking-[0.15em] text-parchment-500">{member.role}</p>
                        </button>
                        <RowActions
                          index={i}
                          total={members.length}
                          onUp={() => move('members', members, i, -1)}
                          onDown={() => move('members', members, i, 1)}
                          onDelete={() => removeItem('members', members, i, `成员「${member.name}」`)}
                        />
                      </div>
                      {isOpen && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <TextField label="昵称" value={member.name} onChange={(v) => setAt(`members.${i}.name`, v)} />
                          <TextField label="身份 / 擅长领域" value={member.role} onChange={(v) => setAt(`members.${i}.role`, v)} />
                          <SelectField
                            label="创作主题"
                            value={member.topic}
                            options={topics.map((t) => t.id)}
                            onChange={(v) => setAt(`members.${i}.topic`, v)}
                          />
                          <div className="md:col-span-2">
                            <ImageField label="头像图片（上传/路径）" value={member.avatar} onChange={(v) => setAt(`members.${i}.avatar`, v)} />
                          </div>
                          <TextField
                            label="擅长标签（逗号分隔）"
                            value={tagsText}
                            onChange={(v) =>
                              setAt(
                                `members.${i}.tags`,
                                v
                                  .split(/[,，]/)
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              )
                            }
                          />
                          <div className="md:col-span-2">
                            <ImageField label="代表作图片（上传/路径）" value={member.work.image} onChange={(v) => setAt(`members.${i}.work.image`, v)} />
                          </div>
                          <div className="md:col-span-2">
                            <TextField label="成员简介" value={member.bio} textarea onChange={(v) => setAt(`members.${i}.bio`, v)} />
                          </div>
                          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                            <TextField label="代表作名称" value={member.work.title} onChange={(v) => setAt(`members.${i}.work.title`, v)} />
                            <TextField label="代表作说明" value={member.work.desc} onChange={(v) => setAt(`members.${i}.work.desc`, v)} />
                          </div>

                          {/* 成员更多作品 */}
                          <div className="md:col-span-2 mt-1">
                            <div className="flex items-center justify-between">
                              <Label>更多作品（{member.works?.length ?? 0}）</Label>
                              <button
                                type="button"
                                onClick={() =>
                                  setAt(`members.${i}.works`, [
                                    ...(member.works ?? []),
                                    { title: '新作品（占位）', image: member.work.image, desc: '作品说明占位' },
                                  ])
                                }
                                className="rounded border border-dashed border-brand-500/50 px-2 py-0.5 text-[10px] text-brand-400 hover:bg-brand-500/10"
                              >
                                + 添加
                              </button>
                            </div>
                            <div className="mt-2 space-y-2">
                              {(member.works ?? []).map((work, j) => (
                                <div key={`${member.id}-w${j}`} className="rounded-md border border-white/10 bg-ink-950/80 p-2">
                                  <div className="grid gap-2 md:grid-cols-3">
                                    <TextField label="作品名" value={work.title} onChange={(v) => setAt(`members.${i}.works.${j}.title`, v)} />
                                    <TextField label="说明" value={work.desc} onChange={(v) => setAt(`members.${i}.works.${j}.desc`, v)} />
                                  </div>
                                  <div className="mt-2">
                                    <ImageField label="作品图片（上传/路径）" value={work.image} onChange={(v) => setAt(`members.${i}.works.${j}.image`, v)} />
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setAt(`members.${i}.works`, (member.works ?? []).filter((_, k) => k !== j))}
                                      className="rounded border border-brand-500/30 px-2 py-0.5 text-[10px] text-brand-400 hover:bg-brand-500/10"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 作品档案 */}
          {tab === 'works' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">WORKS ARCHIVE · 作品档案 {works.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('worksArchive', works, blankWork())}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增作品
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {works.map((work, i) => {
                  const isOpen = expanded.has(1000 + i)
                  return (
                    <div key={work.id} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleExpanded(1000 + i)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm tracking-[0.12em] text-parchment-100">{work.title}</p>
                          <p className="truncate font-mono text-[10px] tracking-[0.15em] text-parchment-500">
                            {work.author} · {topics.find((t) => t.id === work.topic)?.name ?? work.topic} · {work.category}
                          </p>
                        </button>
                        <RowActions
                          index={i}
                          total={works.length}
                          onUp={() => move('worksArchive', works, i, -1)}
                          onDown={() => move('worksArchive', works, i, 1)}
                          onDelete={() => removeItem('worksArchive', works, i, `作品「${work.title}」`)}
                        />
                      </div>
                      {isOpen && (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <TextField label="作品名" value={work.title} onChange={(v) => setAt(`worksArchive.${i}.title`, v)} />
                          <TextField label="作者" value={work.author} onChange={(v) => setAt(`worksArchive.${i}.author`, v)} />
                          <div className="md:col-span-2">
                            <ImageField label="作品图片（上传/路径）" value={work.image} onChange={(v) => setAt(`worksArchive.${i}.image`, v)} />
                          </div>
                          <TextField label="年份（可空）" value={work.year ?? ''} onChange={(v) => setAt(`worksArchive.${i}.year`, v)} />
                          <SelectField
                            label="创作主题"
                            value={work.topic}
                            options={topics.map((t) => t.id)}
                            onChange={(v) => setAt(`worksArchive.${i}.topic`, v)}
                          />
                          <SelectField
                            label="作品分类"
                            value={work.category}
                            options={categories}
                            onChange={(v) => setAt(`worksArchive.${i}.category`, v)}
                          />
                          <div className="md:col-span-2">
                            <TextField label="作品说明" value={work.desc} textarea onChange={(v) => setAt(`worksArchive.${i}.desc`, v)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 新闻 */}
          {tab === 'news' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">NEWS · 新闻 {content.about.news.length}</p>
                <button
                  type="button"
                  onClick={() =>
                    addItem('about.news', content.about.news, {
                      date: '20XX-XX-XX',
                      title: '新新闻（占位）',
                      desc: '新闻摘要占位',
                      tag: '公告',
                      body: '新闻正文占位',
                    })
                  }
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增新闻
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {content.about.news.map((item, i) => (
                  <div key={`${item.title}-${i}`} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">
                        {item.date} · {item.title}
                      </p>
                      <RowActions
                        index={i}
                        total={content.about.news.length}
                        onUp={() => move('about.news', content.about.news, i, -1)}
                        onDown={() => move('about.news', content.about.news, i, 1)}
                        onDelete={() => removeItem('about.news', content.about.news, i, `新闻「${item.title}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <TextField label="日期" value={item.date} onChange={(v) => setAt(`about.news.${i}.date`, v)} />
                      <TextField label="分类" value={item.tag ?? '公告'} onChange={(v) => setAt(`about.news.${i}.tag`, v)} />
                      <div className="md:col-span-2">
                        <TextField label="标题" value={item.title} onChange={(v) => setAt(`about.news.${i}.title`, v)} />
                      </div>
                      <div className="md:col-span-2">
                        <TextField label="摘要" value={item.desc} textarea onChange={(v) => setAt(`about.news.${i}.desc`, v)} />
                      </div>
                      <div className="md:col-span-2">
                        <TextField label="正文" value={item.body ?? item.desc} textarea onChange={(v) => setAt(`about.news.${i}.body`, v)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 文化 */}
          {tab === 'culture' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">CULTURE · 文化 {content.about.culture.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('about.culture', content.about.culture, { title: '新文化条目（占位）', desc: '文化描述占位' })}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增文化条目
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {content.about.culture.map((item, i) => (
                  <div key={`${item.title}-${i}`} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">{item.title}</p>
                      <RowActions
                        index={i}
                        total={content.about.culture.length}
                        onUp={() => move('about.culture', content.about.culture, i, -1)}
                        onDown={() => move('about.culture', content.about.culture, i, 1)}
                        onDelete={() => removeItem('about.culture', content.about.culture, i, `文化条目「${item.title}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3">
                      <TextField label="标题" value={item.title} onChange={(v) => setAt(`about.culture.${i}.title`, v)} />
                      <TextField label="描述" value={item.desc} textarea onChange={(v) => setAt(`about.culture.${i}.desc`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 年鉴 */}
          {tab === 'annals' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">ANNALS · 年鉴 {content.about.annals.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('about.annals', content.about.annals, { date: '20XX 年', title: '新事件（占位）', desc: '事件描述占位' })}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增事件
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {content.about.annals.map((item, i) => (
                  <div key={`${item.title}-${i}`} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">
                        {item.date} · {item.title}
                      </p>
                      <RowActions
                        index={i}
                        total={content.about.annals.length}
                        onUp={() => move('about.annals', content.about.annals, i, -1)}
                        onDown={() => move('about.annals', content.about.annals, i, 1)}
                        onDelete={() => removeItem('about.annals', content.about.annals, i, `事件「${item.title}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField label="日期" value={item.date} onChange={(v) => setAt(`about.annals.${i}.date`, v)} />
                        <TextField label="标题" value={item.title} onChange={(v) => setAt(`about.annals.${i}.title`, v)} />
                      </div>
                      <TextField label="描述" value={item.desc} textarea onChange={(v) => setAt(`about.annals.${i}.desc`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {tab === 'faq' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">FAQ · 常见问题 {content.faq.items.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('faq.items', content.faq.items, { category: '加入', q: '新问题（占位）？', a: '回答占位' })}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增问答
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {content.faq.items.map((item, i) => (
                  <div key={`${item.q}-${i}`} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">{item.q}</p>
                      <RowActions
                        index={i}
                        total={content.faq.items.length}
                        onUp={() => move('faq.items', content.faq.items, i, -1)}
                        onDown={() => move('faq.items', content.faq.items, i, 1)}
                        onDelete={() => removeItem('faq.items', content.faq.items, i, `问答「${item.q}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField label="分类" value={item.category} onChange={(v) => setAt(`faq.items.${i}.category`, v)} />
                        <TextField label="问题" value={item.q} onChange={(v) => setAt(`faq.items.${i}.q`, v)} />
                      </div>
                      <TextField label="回答" value={item.a} textarea onChange={(v) => setAt(`faq.items.${i}.a`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 创作主题 */}
          {tab === 'topics' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">TOPICS · 创作主题 {topics.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('topics', topics, { id: `t-${Date.now()}`, name: '新主题（占位）', desc: '主题说明占位', keywords: ['占位标签'] })}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增主题
                </button>
              </div>
              <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-[0.15em] text-parchment-500">
                注意：删除主题前请先确认成员与作品的 topic 不再引用它。
              </p>
              <div className="mt-4 space-y-3">
                {topics.map((topic, i) => (
                  <div key={topic.id} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">{topic.name}</p>
                      <RowActions
                        index={i}
                        total={topics.length}
                        onUp={() => move('topics', topics, i, -1)}
                        onDown={() => move('topics', topics, i, 1)}
                        onDelete={() => removeItem('topics', topics, i, `主题「${topic.name}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField label="名称" value={topic.name} onChange={(v) => setAt(`topics.${i}.name`, v)} />
                        <TextField label="ID（英文标识，勿随意改）" value={topic.id} onChange={(v) => setAt(`topics.${i}.id`, v)} />
                      </div>
                      <TextField label="说明" value={topic.desc} textarea onChange={(v) => setAt(`topics.${i}.desc`, v)} />
                      <TextField
                        label="关键词（逗号分隔）"
                        value={(topic.keywords ?? []).join(',')}
                        onChange={(v) =>
                          setAt(
                            `topics.${i}.keywords`,
                            v
                              .split(/[,，]/)
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 作品分类 */}
          {tab === 'categories' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">WORK CATEGORIES · 作品分类 {categories.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('worksCategories', categories, '新分类')}
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增分类
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {categories.map((category, i) => (
                  <div key={`${category}-${i}`} className="flex items-center gap-3 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <input
                      value={category}
                      onChange={(event) => setAt(`worksCategories.${i}`, event.target.value)}
                      className={inputCls}
                    />
                    <RowActions
                      index={i}
                      total={categories.length}
                      onUp={() => move('worksCategories', categories, i, -1)}
                      onDown={() => move('worksCategories', categories, i, 1)}
                      onDelete={() => removeItem('worksCategories', categories, i, `分类「${category}」`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 约稿价格 */}
          {tab === 'commission' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">COMMISSION PRICE · 约稿价格 {content.commission.priceTable?.length ?? 0}</p>
                <button
                  type="button"
                  onClick={() =>
                    addItem('commission.priceTable', content.commission.priceTable ?? [], {
                      tier: '新档位（占位）',
                      scope: '范围说明占位',
                      price: '¥ 占位',
                      leadTime: '占位工期',
                    })
                  }
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增档位
                </button>
              </div>
              <div className="mt-2">
                <TextField
                  label="价格说明"
                  value={content.commission.priceNote}
                  textarea
                  onChange={(v) => setAt('commission.priceNote', v)}
                />
              </div>
              <div className="mt-4 space-y-3">
                {(content.commission.priceTable ?? []).map((row, i) => (
                  <div key={`${row.tier}-${i}`} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">{row.tier}</p>
                      <RowActions
                        index={i}
                        total={content.commission.priceTable?.length ?? 0}
                        onUp={() => move('commission.priceTable', content.commission.priceTable ?? [], i, -1)}
                        onDown={() => move('commission.priceTable', content.commission.priceTable ?? [], i, 1)}
                        onDelete={() => removeItem('commission.priceTable', content.commission.priceTable ?? [], i, `档位「${row.tier}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <TextField label="档位名" value={row.tier} onChange={(v) => setAt(`commission.priceTable.${i}.tier`, v)} />
                      <TextField label="价格" value={row.price} onChange={(v) => setAt(`commission.priceTable.${i}.price`, v)} />
                      <TextField label="范围" value={row.scope} onChange={(v) => setAt(`commission.priceTable.${i}.scope`, v)} />
                      <TextField label="工期" value={row.leadTime} onChange={(v) => setAt(`commission.priceTable.${i}.leadTime`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
