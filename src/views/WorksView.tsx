import { useMemo, useState } from 'react'
import ImageTrail from '../components/ImageTrail'
import LetterSwap from '../components/LetterSwap'
import WorkArchiveCard from '../components/WorkArchiveCard'
import WorkFolderCard from '../components/WorkFolderCard'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { MEMBER_INDEX } from '../lib/pages'
import { setActiveMemberId } from '../lib/memberBus'
import { requestScene } from '../lib/sceneBus'

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-[0.18em] transition-all duration-300 ${
        active
          ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-[0_0_14px_rgba(199,27,27,0.25)]'
          : 'border-white/10 bg-ink-950/45 text-parchment-300 hover:border-brand-500/40 hover:text-brand-400'
      }`}
    >
      {label}
    </button>
  )
}

/** 作品集页：一人一张代表作，点击进入成员个人页 */
export default function WorksView() {
  const { content, admin } = useContent()
  const worksPage = content.works
  const members = content.members
  const topics = content.topics
  const trailImages = members.flatMap((member) => [member.avatar, member.work.image])
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(4)
  const [archiveTopic, setArchiveTopic] = useState<string | null>(null)
  const [archiveCategory, setArchiveCategory] = useState<string | null>(null)
  const [archiveAuthor, setArchiveAuthor] = useState<string | null>(null)
  const [archiveCount, setArchiveCount] = useState(6)

  const filtered = useMemo(
    () =>
      members
        .map((member, index) => ({ member, index }))
        .filter(({ member }) => selectedTopic === null || member.topic === selectedTopic),
    [members, selectedTopic],
  )
  const shown = filtered.slice(0, visibleCount)

  const selectTopic = (id: string | null) => {
    setSelectedTopic(id)
    setVisibleCount(4)
  }

  const toggleExpand = () => {
    setVisibleCount((v) => (v >= filtered.length ? 4 : Math.min(filtered.length, v + 4)))
  }

  const countFor = (topicId: string) => members.filter((member) => member.topic === topicId).length

  const archiveAll = content.worksArchive
  const archiveAuthors = useMemo(() => Array.from(new Set(archiveAll.map((w) => w.author))).sort(), [archiveAll])
  const archiveFiltered = useMemo(
    () =>
      archiveAll
        .map((work, index) => ({ work, index }))
        .filter(
          ({ work }) =>
            (archiveTopic === null || work.topic === archiveTopic) &&
            (archiveCategory === null || work.category === archiveCategory) &&
            (archiveAuthor === null || work.author === archiveAuthor),
        ),
    [archiveAll, archiveTopic, archiveCategory, archiveAuthor],
  )
  const archiveShown = archiveFiltered.slice(0, archiveCount)

  const selectArchiveTopic = (id: string | null) => {
    setArchiveTopic(id)
    setArchiveCount(6)
  }
  const selectArchiveCategory = (id: string | null) => {
    setArchiveCategory(id)
    setArchiveCount(6)
  }
  const selectArchiveAuthor = (name: string | null) => {
    setArchiveAuthor(name)
    setArchiveCount(6)
  }
  const toggleArchiveExpand = () => {
    setArchiveCount((v) => (v >= archiveFiltered.length ? 6 : Math.min(archiveFiltered.length, v + 6)))
  }

  return (
    <section
      id="works"
      data-scroll-root
      className="relative h-full w-full overflow-y-auto"
    >
      {/* 图片鼠标轨迹（视频中的 Image Trail） */}
      <ImageTrail images={trailImages} />

      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 05 · WORKS · 作品集</p>
          {admin ? (
            <EditableText
              as="h1"
              value={worksPage.title}
              path="works.title"
              className="scene-block mt-5 w-full text-center font-display text-5xl tracking-[0.18em] text-parchment-100 lg:text-7xl"
            />
          ) : (
            <LetterSwap
              as="h1"
              text={worksPage.title}
              className="scene-block mt-5 font-display text-5xl tracking-[0.18em] text-parchment-100 lg:text-7xl"
            />
          )}
          <EditableText
            as="p"
            value={worksPage.subtitle}
            path="works.subtitle"
            className="mt-3 w-full text-center text-sm tracking-[0.3em] text-parchment-400"
          />
          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-parchment-300">
            作品收在文件夹里，露出边缘等待翻阅；悬停抽出查看，点击进入成员个人页。
          </p>
        </div>

        {/* 主题筛选 chips */}
        <div className="scene-block mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => selectTopic(null)}
            className={`rounded-full border px-5 py-2 font-mono text-[11px] tracking-[0.2em] transition-all duration-300 ${
              selectedTopic === null
                ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-[0_0_18px_rgba(199,27,27,0.25)]'
                : 'border-white/10 bg-ink-950/45 text-parchment-300 hover:border-brand-500/40 hover:text-brand-400'
            }`}
          >
            全部 · {members.length}
          </button>
          {topics.map((topic) => {
            const active = selectedTopic === topic.id
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => selectTopic(topic.id)}
                className={`rounded-full border px-5 py-2 font-mono text-[11px] tracking-[0.2em] transition-all duration-300 ${
                  active
                    ? 'border-brand-500 bg-brand-500/15 text-brand-400 shadow-[0_0_18px_rgba(199,27,27,0.25)]'
                    : 'border-white/10 bg-ink-950/45 text-parchment-300 hover:border-brand-500/40 hover:text-brand-400'
                }`}
              >
                {topic.name} · {countFor(topic.id)}
              </button>
            )
          })}
        </div>

        {/* 文件夹式作品卡（一人一个文件夹） */}
        <div className="scene-block mt-14 grid grid-cols-1 justify-items-center gap-10 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map(({ member, index: i }) => (
            <WorkFolderCard
              key={member.id}
              member={member}
              memberIndex={i}
              onClick={() => {
                setActiveMemberId(member.id)
                requestScene(MEMBER_INDEX)
              }}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-16 text-center font-mono text-sm tracking-[0.3em] text-parchment-500">
            该主题暂无成员作品（占位提示）
          </p>
        )}

        {filtered.length > 4 && (
          <div className="scene-block mt-12 flex justify-center">
            <button
              type="button"
              onClick={toggleExpand}
              className="rounded-full border border-brand-500/40 bg-ink-950/55 px-8 py-3 font-mono text-xs tracking-[0.25em] text-brand-400 backdrop-blur-sm transition-all duration-300 hover:border-brand-500 hover:bg-brand-500/10 hover:shadow-[0_0_24px_rgba(199,27,27,0.3)]"
            >
              {visibleCount >= filtered.length ? '收起 ↑' : '展开更多作品 ↓'}
            </button>
          </div>
        )}

        {/* 作品档案：全站作品库（管理员可增删改与分类） */}
        <div className="scene-block mt-24">
          <div className="flex items-baseline gap-4">
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 05A · WORKS ARCHIVE · 作品档案</p>
            <span className="h-px w-16 bg-white/15" />
          </div>
          <h2 className="mt-3 font-display text-4xl tracking-[0.14em] text-parchment-100">作品档案</h2>
          <p className="mt-2 text-sm tracking-[0.2em] text-parchment-400">
            按创作主题与作品分类归档的全站作品库 · {archiveAll.length} 件
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FilterChip active={archiveTopic === null} onClick={() => selectArchiveTopic(null)} label="全部主题" />
            {topics.map((topic) => (
              <FilterChip
                key={topic.id}
                active={archiveTopic === topic.id}
                onClick={() => selectArchiveTopic(topic.id)}
                label={topic.name}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FilterChip active={archiveCategory === null} onClick={() => selectArchiveCategory(null)} label="全部类型" />
            {content.worksCategories.map((category) => (
              <FilterChip
                key={category}
                active={archiveCategory === category}
                onClick={() => selectArchiveCategory(category)}
                label={category}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.25em] text-parchment-500">作者</span>
            <select
              value={archiveAuthor ?? ''}
              onChange={(event) => selectArchiveAuthor(event.target.value || null)}
              className="rounded-md border border-white/10 bg-ink-950/70 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-parchment-300 outline-none transition-colors focus:border-brand-500"
            >
              <option value="">全部作者</option>
              {archiveAuthors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {archiveShown.map(({ work, index }) => {
              const member = members.find((m) => m.name === work.author)
              const topicName = topics.find((t) => t.id === work.topic)?.name ?? work.topic
              return (
                <WorkArchiveCard
                  key={work.id}
                  work={work}
                  workIndex={index}
                  topicName={topicName}
                  canOpen={!!member}
                  onClick={() => {
                    if (member) {
                      setActiveMemberId(member.id)
                      requestScene(MEMBER_INDEX)
                    }
                  }}
                />
              )
            })}
          </div>

          {archiveFiltered.length === 0 && (
            <p className="mt-8 text-center font-mono text-sm tracking-[0.3em] text-parchment-500">
              该筛选条件下暂无作品（占位提示）
            </p>
          )}
          {archiveFiltered.length > 6 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={toggleArchiveExpand}
                className="rounded-full border border-brand-500/40 bg-ink-950/55 px-8 py-3 font-mono text-xs tracking-[0.25em] text-brand-400 backdrop-blur-sm transition-all duration-300 hover:border-brand-500 hover:bg-brand-500/10 hover:shadow-[0_0_24px_rgba(199,27,27,0.3)]"
              >
                {archiveCount >= archiveFiltered.length ? '收起 ↑' : '展开更多作品 ↓'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
