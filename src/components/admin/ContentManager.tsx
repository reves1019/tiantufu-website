import { useEffect, useState, type ReactNode } from 'react'
import type { Member, WorkItem } from '../../config/site'
import { useContent } from '../../lib/contentStore'
import { flattenUiTextFields } from '../../lib/uiTextFields'
import { useDialogFocus } from '../../lib/useDialogFocus'
import ImageField from './ImageField'
import WorkDetailsFields from './WorkDetailsFields'
import { memberDomains } from '../../lib/memberProfile'

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
  { id: 'contest', label: '赛事' },
  { id: 'commission', label: '约稿价格' },
  { id: 'site', label: '站点信息' },
  { id: 'intro', label: '开场序章' },
  { id: 'media', label: '品牌与首页素材' },
  { id: 'ui', label: '页面文案' },
] as const

type TabId = (typeof TABS)[number]['id']

/** 内容管理：管理员可增删改成员、作品档案、新闻、文化、年鉴、FAQ、主题、分类与约稿价格 */
export default function ContentManager() {
  const { content, admin, hydrated, updateList, setAt, cloudMode, cloudSyncState, initializeCloudContent, retryCloudSync, restoreCloudContent } = useContent()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('members')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [initializingCloud, setInitializingCloud] = useState(false)
  const [retryingCloud, setRetryingCloud] = useState(false)
  const [cloudMessage, setCloudMessage] = useState('')
  const dialogOpen = open && hydrated && !(cloudMode && cloudSyncState === 'connecting')
  const dialogRef = useDialogFocus<HTMLDivElement>(dialogOpen, () => setOpen(false))

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('ttf-content-manager-open', onOpen)
    return () => window.removeEventListener('ttf-content-manager-open', onOpen)
  }, [])

  if (!admin || !open) return null
  if (cloudMode && cloudSyncState === 'connecting') {
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="status">
        <div className="w-[min(420px,94vw)] rounded-xl border border-white/15 bg-ink-900 p-6 text-center">
          <p className="font-mono text-xs tracking-[0.25em] text-brand-400">正在确认云端内容</p>
          <p className="mt-3 text-sm leading-relaxed text-parchment-300">连接完成前暂不开放编辑，避免本机旧副本覆盖云端版本。</p>
          <button type="button" onClick={() => setOpen(false)} className="mt-5 rounded border border-white/15 px-4 py-2 text-xs text-parchment-300 hover:border-brand-500/50 hover:text-brand-400">关闭</button>
        </div>
      </div>
    )
  }
  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4" role="status">
        <p className="border border-white/15 bg-ink-900 px-6 py-5 text-sm text-parchment-200">正在读取已保存的网站内容…</p>
      </div>
    )
  }

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
  const introScenes = content.intro.scenes ?? []
  const socials = content.site.contact.socials ?? []

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
    authorMemberId: members[0]?.id,
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
      <div ref={dialogRef} className="flex h-[min(760px,90vh)] w-[min(1180px,96vw)] overflow-hidden rounded-2xl border border-brand-500/30 bg-ink-900/95 shadow-[0_0_80px_rgba(199,27,27,0.25)] backdrop-blur-xl">
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
          {cloudMode && (
            <div className={`mb-5 rounded-lg border px-4 py-3 ${cloudSyncState === 'error' ? 'border-brand-500/40 bg-brand-500/10' : 'border-white/10 bg-ink-950/60'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`font-mono text-[10px] tracking-[0.22em] ${cloudSyncState === 'error' ? 'text-brand-400' : 'text-parchment-300'}`}>
                    {cloudSyncState === 'ready'
                      ? 'CLOUD · 云端内容已连接'
                      : cloudSyncState === 'conflict'
                        ? 'CLOUD · 版本冲突，草稿未丢弃'
                        : cloudSyncState === 'uninitialized'
                        ? 'CLOUD · 等待首次内容迁移'
                        : cloudSyncState === 'error'
                          ? 'CLOUD · 同步异常'
                          : 'CLOUD · 正在连接'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-parchment-500">
                    {cloudSyncState === 'ready'
                      ? '管理员修改会同步到云端；成员仅可维护自己的公开资料。'
                      : cloudSyncState === 'conflict'
                        ? '其他设备已更新内容，已暂停覆盖云端。请备份草稿并加载云端，再手动合并需要保留的修改。'
                        : cloudSyncState === 'uninitialized'
                        ? '请确认当前浏览器是完整的内容来源，再执行一次性初始化；已有云端内容不会被覆盖。'
                        : cloudSyncState === 'error'
                          ? '本机编辑仍会暂存，但尚未确认云端同步。请检查连接与数据库策略。'
                          : '连接期间不会将本机旧内容自动覆盖云端。'}
                  </p>
                </div>
                {cloudSyncState === 'uninitialized' && (
                  <button
                    type="button"
                    disabled={initializingCloud}
                    onClick={() => {
                      if (!window.confirm('仅当这台浏览器保存了最新完整内容时继续。将先把本机图片上传到公开共享素材库，再写入初始内容；云端若已初始化，不会覆盖。继续吗？')) return
                      setInitializingCloud(true)
                      setCloudMessage('')
                      void initializeCloudContent().then((result) => {
                        setCloudMessage(result.ok ? '初始内容已安全写入云端。' : result.error ?? '初始化失败。')
                      }).finally(() => setInitializingCloud(false))
                    }}
                    className="rounded border border-brand-500/50 bg-brand-500/10 px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-brand-400 hover:bg-brand-500/20 disabled:opacity-50"
                  >
                    {initializingCloud ? '正在上传图片与初始化…' : '首次同步本机内容'}
                  </button>
                )}
                {cloudSyncState === 'conflict' && (
                  <button type="button" disabled={retryingCloud} className="rounded border border-brand-500/50 px-3 py-2 text-xs text-brand-400 disabled:opacity-50"
                    onClick={() => {
                      if (!window.confirm('将下载并在本机另存当前草稿，再加载云端最新版本。之后可对照备份手动合并。继续吗？')) return
                      setRetryingCloud(true)
                      void restoreCloudContent().then((result) => setCloudMessage(result.ok ? '草稿已另存并下载，现已加载云端版本。' : result.error ?? '加载失败。')).finally(() => setRetryingCloud(false))
                    }}>{retryingCloud ? '正在备份与加载…' : '备份草稿并加载云端'}</button>
                )}
                {cloudSyncState === 'error' && (
                  <button
                    type="button"
                    disabled={retryingCloud}
                    onClick={() => {
                      setRetryingCloud(true)
                      void retryCloudSync().finally(() => setRetryingCloud(false))
                    }}
                    className="rounded border border-white/15 px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-parchment-300 hover:border-brand-500/50 hover:text-brand-400 disabled:opacity-50"
                  >
                    {retryingCloud ? '正在重试…' : '重试云端同步'}
                  </button>
                )}
              </div>
              {cloudMessage && <p role="status" className="mt-2 text-xs text-gold-300">{cloudMessage}</p>}
            </div>
          )}
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
                          <fieldset className="md:col-span-2"><legend className="text-xs text-parchment-400">创作领域（可多选；每幅作品另外分类）</legend><div className="flex flex-wrap gap-4">{topics.map((topic) => <label key={topic.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={memberDomains(member).includes(topic.id)} onChange={(event) => setAt(`members.${i}.domains`, event.target.checked ? [...memberDomains(member), topic.id] : memberDomains(member).filter((id) => id !== topic.id))} />{topic.name}</label>)}</div></fieldset>
                          <TextField label="社团身份（由管理员确认）" value={member.societyRole ?? ''} onChange={(v) => setAt(`members.${i}.societyRole`, v)} />
                          <TextField label="QQ / 社区昵称（可空）" value={member.contactName ?? ''} onChange={(v) => setAt(`members.${i}.contactName`, v)} />
                          <TextField label="加入年份（可空）" value={member.joinedYear ?? ''} onChange={(v) => setAt(`members.${i}.joinedYear`, v)} />
                          <TextField label="个人签名（可空）" value={member.signature ?? ''} onChange={(v) => setAt(`members.${i}.signature`, v)} />
                          <TextField label="合作 / 约稿状态（可空）" value={member.cooperation ?? ''} onChange={(v) => setAt(`members.${i}.cooperation`, v)} />
                          <TextField label="公开个人链接（http / https；非登录邮箱）" value={member.publicUrl ?? ''} onChange={(v) => setAt(`members.${i}.publicUrl`, v)} />
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
                            <ImageField label="代表作图片（上传/路径）" value={member.work.image} onChange={(v) => setAt(`members.${i}.work`, { ...member.work, image: v, fullImage: undefined })} />
                            <ImageField label="阅读用高清图（可空；仅放大时加载）" value={member.work.fullImage ?? ''} onChange={(v) => setAt(`members.${i}.work.fullImage`, v)} />
                          </div>
                          <div className="md:col-span-2">
                            <TextField label="成员简介" value={member.bio} textarea onChange={(v) => setAt(`members.${i}.bio`, v)} />
                            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={member.published ?? !['weilai-zhitu', 'changhe-lingtu', 'xingtu-yuanyu'].includes(member.id)} onChange={(event) => setAt(`members.${i}.published`, event.target.checked)} />公开展示此成员（关闭后仍保留在管理库）</label>
                          </div>
                          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                            <TextField label="代表作名称" value={member.work.title} onChange={(v) => setAt(`members.${i}.work.title`, v)} />
                            <TextField label="代表作说明" value={member.work.desc} onChange={(v) => setAt(`members.${i}.work.desc`, v)} />
                          </div>
                          <SelectField label="代表作主题（独立于作者领域）" value={member.work.topic ?? member.topic} options={topics.map((t) => t.id)} onChange={(v) => setAt(`members.${i}.work.topic`, v)} />
                          <SelectField label="代表作分类" value={member.work.category ?? categories[0] ?? ''} options={categories} onChange={(v) => setAt(`members.${i}.work.category`, v)} />
                          <TextField label="代表作阅读札记" value={member.work.story ?? ''} textarea onChange={(v) => setAt(`members.${i}.work.story`, v)} />
                          <WorkDetailsFields work={member.work} path={`members.${i}.work`} />
                          <p className="text-xs text-parchment-400 md:col-span-2">同一张图已在“作品档案”中登记时，公开页面以档案说明为准，请在那里维护作品信息。</p>

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
                                    <ImageField label="阅读用高清图（可空）" value={work.fullImage ?? ''} onChange={(v) => setAt(`members.${i}.works.${j}.fullImage`, v)} />
                                  </div>
                                  <div className="mt-2">
                                    <ImageField label="作品图片（上传/路径）" value={work.image} onChange={(v) => setAt(`members.${i}.works.${j}.image`, v)} />
                                    <SelectField label="该作品的创作主题" value={work.topic ?? member.topic} options={topics.map((t) => t.id)} onChange={(v) => setAt(`members.${i}.works.${j}.topic`, v)} />
                                    <SelectField label="该作品的分类" value={work.category ?? categories[0] ?? ''} options={categories} onChange={(v) => setAt(`members.${i}.works.${j}.category`, v)} />
                                    <TextField label="阅读札记" value={work.story ?? ''} textarea onChange={(v) => setAt(`members.${i}.works.${j}.story`, v)} />
                                    <WorkDetailsFields work={work} path={`members.${i}.works.${j}`} />
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
                          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={work.published ?? !['w-shengming-2', 'w-shengxiong-2', 'w-baicai-2', 'w-weilai-1', 'w-weilai-2', 'w-changhe-1', 'w-changhe-2', 'w-xingtu-1', 'w-xingtu-2'].includes(work.id)} onChange={(event) => setAt(`worksArchive.${i}.published`, event.target.checked)} />公开展示此作品</label>
                          <TextField label="作者署名" value={work.author} onChange={(author) => updateList('worksArchive', works.map((entry, index) => index === i ? { ...entry, author, authorMemberId: undefined } : entry))} />
                          <label className="flex flex-col gap-1.5 text-xs text-parchment-400">
                            所属成员（改名后作品仍跟随本人）
                            <select
                              className={inputCls}
                              value={work.authorMemberId ?? ''}
                              onChange={(event) => {
                                const member = members.find((entry) => entry.id === event.target.value)
                                updateList('worksArchive', works.map((entry, index) => index === i ? {
                                  ...entry, authorMemberId: member?.id, author: member?.name ?? entry.author,
                                } : entry))
                              }}
                            >
                              <option value="">独立署名 / 尚未关联成员</option>
                              {work.authorMemberId && !members.some((member) => member.id === work.authorMemberId) && (
                                <option value={work.authorMemberId}>原成员已移除（请重新关联）</option>
                              )}
                              {members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.id}</option>)}
                            </select>
                          </label>
                          <div className="md:col-span-2">
                            <ImageField label="作品图片（上传/路径）" value={work.image} onChange={(v) => setAt(`worksArchive.${i}`, { ...work, image: v, fullImage: undefined })} />
                            <ImageField label="阅读用高清图（可空）" value={work.fullImage ?? ''} onChange={(v) => setAt(`worksArchive.${i}.fullImage`, v)} />
                          </div>
                          <TextField label="年份（可空）" value={work.year ?? ''} onChange={(v) => setAt(`worksArchive.${i}.year`, v)} />
                          <WorkDetailsFields work={work} path={`worksArchive.${i}`} />
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
                            <TextField label="地图阅读札记（作者提供背景、读图顺序、图例说明）" value={work.story ?? ''} textarea onChange={(v) => setAt(`worksArchive.${i}.story`, v)} />
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

          {/* 赛事（含往届优秀作品图片上传） */}
          {tab === 'contest' && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">CONTEST · 单图制图大赛</p>
              </div>
              <div className="mt-4 grid gap-3">
                <TextField label="赛事标题" value={content.contest.title} onChange={(v) => setAt('contest.title', v)} />
                <TextField label="副标题" value={content.contest.subtitle} onChange={(v) => setAt('contest.subtitle', v)} />
                <TextField
                  label="B 站宣传视频链接"
                  value={content.contest.videoUrl}
                  onChange={(v) => setAt('contest.videoUrl', v)}
                />
                <TextField label="比赛细则" value={content.contest.rules} textarea onChange={(v) => setAt('contest.rules', v)} />
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="font-mono text-xs tracking-[0.35em] text-brand-400">
                  往届优秀作品（{content.contest.works.length}）
                </p>
                <button
                  type="button"
                  onClick={() =>
                    addItem('contest.works', content.contest.works, {
                      edition: content.contest.editions[0]?.edition ?? '第一届',
                      title: '新赛事作品（占位）',
                      author: '获奖者（占位）',
                      image: members[0]?.work.image ?? '',
                      desc: '作品说明占位',
                    })
                  }
                  className="rounded-md border border-dashed border-brand-500/50 px-4 py-1.5 text-xs tracking-[0.2em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 新增赛事作品
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {content.contest.works.map((work, i) => (
                  <div key={`${work.title}-${i}`} className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm tracking-[0.12em] text-parchment-100">
                        {work.edition} · {work.title}
                      </p>
                      <RowActions
                        index={i}
                        total={content.contest.works.length}
                        onUp={() => move('contest.works', content.contest.works, i, -1)}
                        onDown={() => move('contest.works', content.contest.works, i, 1)}
                        onDelete={() => removeItem('contest.works', content.contest.works, i, `赛事作品「${work.title}」`)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="block">
                          <span className="mb-1 block font-mono text-[9px] tracking-[0.25em] text-parchment-500">届次</span>
                          <select
                            value={work.edition}
                            onChange={(event) => setAt(`contest.works.${i}.edition`, event.target.value)}
                            className={inputCls}
                          >
                            {content.contest.editions.map((e) => (
                              <option key={e.edition} value={e.edition}>
                                {e.edition}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="md:col-span-2">
                          <TextField label="作品名" value={work.title} onChange={(v) => setAt(`contest.works.${i}.title`, v)} />
                        </div>
                      </div>
                      <TextField label="作者" value={work.author} onChange={(v) => setAt(`contest.works.${i}.author`, v)} />
                      <ImageField
                        label="作品图片（上传/路径）"
                        value={work.image}
                        onChange={(v) => setAt(`contest.works.${i}.image`, v)}
                      />
                      <TextField label="作品说明" value={work.desc} textarea onChange={(v) => setAt(`contest.works.${i}.desc`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 站点信息：品牌基础文案、导航项和联系方式 */}
          {tab === 'site' && (
            <div>
              <p className="font-mono text-xs tracking-[0.35em] text-brand-400">SITE IDENTITY · 站点信息</p>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-parchment-500">
                管理品牌名称、首页标语、导航显示文字和对外联系方式。导航链接固定，避免编辑时意外破坏页面路由；所有字段自动保存。
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <TextField label="站点名称" value={content.site.name} onChange={(v) => setAt('site.name', v)} />
                <TextField label="英文名称" value={content.site.nameEn} onChange={(v) => setAt('site.nameEn', v)} />
                <TextField label="首页标语" value={content.site.slogan} onChange={(v) => setAt('site.slogan', v)} />
                <TextField label="首页眉题" value={content.site.overline} onChange={(v) => setAt('site.overline', v)} />
              </div>

              <div className="mt-7">
                <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">NAVIGATION · 导航</p>
                <div className="mt-3 space-y-3">
                  {content.site.nav.map((item, i) => (
                    <div key={item.href} className="rounded-lg border border-white/10 bg-ink-950/45 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-parchment-200">导航项 {String(i + 1).padStart(2, '0')}</span>
                        <code className="font-mono text-[10px] text-parchment-500">固定路由：{item.href}</code>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField label="显示名称" value={item.label} onChange={(v) => setAt(`site.nav.${i}.label`, v)} />
                        <TextField label="辅助说明" value={item.desc} onChange={(v) => setAt(`site.nav.${i}.desc`, v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">CONTACT · 联系方式</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <TextField label="QQ" value={content.site.contact.qq} onChange={(v) => setAt('site.contact.qq', v)} />
                  <TextField label="QQ 群号" value={content.site.contact.qqGroup} onChange={(v) => setAt('site.contact.qqGroup', v)} />
                  <TextField label="B 站主页链接" value={content.site.contact.bilibili} onChange={(v) => setAt('site.contact.bilibili', v)} />
                  <TextField label="联系邮箱" value={content.site.contact.email} onChange={(v) => setAt('site.contact.email', v)} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] tracking-[0.25em] text-parchment-400">社交平台链接</p>
                  <button
                    type="button"
                    onClick={() => addItem('site.contact.socials', socials, { label: '新平台', url: 'https://' })}
                    className="rounded border border-brand-500/50 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-brand-400 hover:bg-brand-500/10"
                  >
                    + 添加平台
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {socials.map((item, i) => (
                    <div key={`${item.label}-${i}`} className="grid gap-3 rounded-lg border border-white/10 bg-ink-950/45 p-4 md:grid-cols-[1fr_2fr_auto] md:items-end">
                      <TextField label="平台名称" value={item.label} onChange={(v) => setAt(`site.contact.socials.${i}.label`, v)} />
                      <TextField label="平台链接" value={item.url} onChange={(v) => setAt(`site.contact.socials.${i}.url`, v)} />
                      <button
                        type="button"
                        onClick={() => removeItem('site.contact.socials', socials, i, `平台「${item.label}」`)}
                        className="rounded border border-white/10 px-3 py-2 font-mono text-[10px] text-parchment-400 hover:border-brand-500/50 hover:text-brand-400"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 开场序章：允许管理员直接替换自动播放章节与按钮文案 */}
          {tab === 'intro' && (
            <div>
              <p className="font-mono text-xs tracking-[0.35em] text-brand-400">INTRO SEQUENCE · 开场序章</p>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-parchment-500">
                修改开始页、跳过按钮及自动播放故事章节。章节按列表顺序播放；更改会自动保存，重新打开网站后仍保留。
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <TextField label="欢迎页标题" value={content.intro.welcomeTitle} onChange={(v) => setAt('intro.welcomeTitle', v)} />
                <TextField label="欢迎页英文标题" value={content.intro.welcomeTitleEn ?? ''} onChange={(v) => setAt('intro.welcomeTitleEn', v)} />
                <TextField label="欢迎页标语" value={content.intro.welcomeSlogan} onChange={(v) => setAt('intro.welcomeSlogan', v)} />
                <TextField label="欢迎页英文标语" value={content.intro.welcomeSloganEn ?? ''} onChange={(v) => setAt('intro.welcomeSloganEn', v)} />
                <TextField label="开始按钮" value={content.intro.startLabel} onChange={(v) => setAt('intro.startLabel', v)} />
                <TextField label="开始按钮英文" value={content.intro.startLabelEn ?? ''} onChange={(v) => setAt('intro.startLabelEn', v)} />
                <TextField label="跳过按钮" value={content.intro.skipLabel} onChange={(v) => setAt('intro.skipLabel', v)} />
                <TextField label="跳过按钮英文" value={content.intro.skipLabelEn ?? ''} onChange={(v) => setAt('intro.skipLabelEn', v)} />
                <TextField label="继续按钮" value={content.intro.continueLabel} onChange={(v) => setAt('intro.continueLabel', v)} />
                <TextField label="序章结束按钮" value={content.intro.enterHomeLabel} onChange={(v) => setAt('intro.enterHomeLabel', v)} />
                <TextField label="进入首页英文" value={content.intro.enterHomeLabelEn ?? ''} onChange={(v) => setAt('intro.enterHomeLabelEn', v)} />
                <TextField label="结尾提示按钮" value={content.intro.enterLabel} onChange={(v) => setAt('intro.enterLabel', v)} />
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">STORY · 故事章节 {introScenes.length}</p>
                <button
                  type="button"
                  onClick={() => addItem('intro.scenes', introScenes, { title: '新章节（占位）', titleEn: 'NEW CHAPTER', text: '章节说明占位，请替换为正式内容。', textEn: 'Chapter description placeholder.' })}
                  className="rounded border border-brand-500/50 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-brand-400 transition-colors hover:bg-brand-500/10"
                >
                  + 添加章节
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {introScenes.map((scene, i) => (
                  <div key={`intro-${i}`} className="rounded-lg border border-white/10 bg-ink-950/45 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] tracking-[0.2em] text-parchment-400">章节 {String(i + 1).padStart(2, '0')}</span>
                      <RowActions
                        index={i}
                        total={introScenes.length}
                        onUp={() => move('intro.scenes', introScenes, i, -1)}
                        onDown={() => move('intro.scenes', introScenes, i, 1)}
                        onDelete={() => removeItem('intro.scenes', introScenes, i, `章节「${scene.title}」`)}
                      />
                    </div>
                    <div className="grid gap-3">
                      <TextField label="章节标题" value={scene.title} onChange={(v) => setAt(`intro.scenes.${i}.title`, v)} />
                      <TextField label="章节英文标题" value={scene.titleEn ?? ''} onChange={(v) => setAt(`intro.scenes.${i}.titleEn`, v)} />
                      <TextField label="章节文案" value={scene.text} textarea onChange={(v) => setAt(`intro.scenes.${i}.text`, v)} />
                      <TextField label="章节英文文案" value={scene.textEn ?? ''} textarea onChange={(v) => setAt(`intro.scenes.${i}.textEn`, v)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'media' && (
            <div className="space-y-6">
              <h3 className="font-display text-xl text-parchment-100">品牌与首页素材</h3>
              <p className="text-xs leading-relaxed text-parchment-300">导航、社团序章与品牌落款使用这些资源。首页及地图探索的地图来自公开作品库；新首页文字在“页面文案”的“地图影展”中编辑。</p>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(content.media.brand).map(([key, value]) => (
                  <ImageField key={key} label={`品牌标识 · ${key}`} value={value} onChange={(v) => setAt(`media.brand.${key}`, v)} />
                ))}
              </div>
              <div className="space-y-4">
                {content.media.maps.map((value, index) => (
                  <ImageField key={index} label={`地图背景 ${index + 1}`} value={value} onChange={(v) => setAt(`media.maps.${index}`, v)} />
                ))}
              </div>
              <details className="space-y-4 rounded border border-white/10 p-4">
              <summary className="cursor-pointer text-sm text-parchment-400">旧版建筑文字帘素材（仅保留备份，不用于新版首页）</summary>
              <p className="text-xs leading-relaxed text-parchment-300">建筑图片请使用透明底 PNG / WebP。每个主题的标题、说明和垂落字符可独立编辑。</p>
              <TextField label="文字帘交互提示" value={content.homeAtlas.interactionHint} onChange={(v) => setAt('homeAtlas.interactionHint', v)} />
              <TextField label="主题入口按钮" value={content.homeAtlas.exploreLabel} onChange={(v) => setAt('homeAtlas.exploreLabel', v)} />
              <TextField label="上一主题无障碍提示" value={content.homeAtlas.previousLabel} onChange={(v) => setAt('homeAtlas.previousLabel', v)} />
              <TextField label="下一主题无障碍提示" value={content.homeAtlas.nextLabel} onChange={(v) => setAt('homeAtlas.nextLabel', v)} />
              {content.homeAtlas.scenes.map((scene, index) => (
                <div key={scene.id} className="space-y-3 rounded-lg border border-white/10 p-4">
                  <ImageField label={`首页建筑 ${index + 1}`} value={scene.roof} onChange={(v) => setAt(`homeAtlas.scenes.${index}.roof`, v)} />
                  <TextField label="主题 ID（对应创作主题）" value={scene.topicId} onChange={(v) => setAt(`homeAtlas.scenes.${index}.topicId`, v)} />
                  <TextField label="标题上方说明" value={scene.kicker} onChange={(v) => setAt(`homeAtlas.scenes.${index}.kicker`, v)} />
                  <TextField label="首页叙事标题（支持换行）" textarea value={scene.title} onChange={(v) => setAt(`homeAtlas.scenes.${index}.title`, v)} />
                  <TextField label="右下角主题说明" textarea value={scene.description} onChange={(v) => setAt(`homeAtlas.scenes.${index}.description`, v)} />
                  <TextField label="文字帘字符" textarea value={scene.words} onChange={(v) => setAt(`homeAtlas.scenes.${index}.words`, v)} />
                </div>
              ))}
              </details>
            </div>
          )}

          {/* 页面文案：首页/介绍/主题/数码地球/作品集/联系页面的固定按钮与提示文字 */}
          {tab === 'ui' && (
            <div>
              <p className="font-mono text-xs tracking-[0.35em] text-brand-400">UI TEXT · 页面文案</p>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-parchment-500">
                这里集中管理首页、社团介绍、创作主题、数码地球、作品集、联系等页面的按钮与提示文字；
                修改即时保存并实时显示在页面上。
              </p>
              <div className="mt-5 space-y-5">
                {Object.entries(content.ui).map(([group, groupText]) => (
                  <div key={group} className="rounded-lg border border-white/10 bg-ink-950/45 p-4">
                    <p className="font-mono text-[10px] tracking-[0.3em] text-brand-400">{group === 'exhibition' ? '地图影展 · 新版首页与地图探索' : group.toUpperCase()}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {flattenUiTextFields(groupText, `ui.${group}`).map(({ path, label, value }) => (
                        <TextField
                          key={path}
                          label={label}
                          value={value}
                          onChange={(v) => setAt(path, v)}
                        />
                      ))}
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
