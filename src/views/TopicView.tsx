import { useEffect, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { DIRECTORY_INDEX, MEMBER_INDEX } from '../lib/pages'
import { setActiveMemberId } from '../lib/memberBus'
import { getActiveTopicId } from '../lib/topicBus'
import { requestScene } from '../lib/sceneBus'

/** 创作主题子页：展示该主题下的作品与作者 */
export default function TopicView() {
  const { content } = useContent()
  const topics = content.topics
  const members = content.members
  const [activeId, setActiveId] = useState<string | null>(() => getActiveTopicId())

  useEffect(() => {
    const onTopic = (event: Event) => {
      setActiveId((event as CustomEvent).detail.id as string)
    }
    window.addEventListener('ttf-topic', onTopic)
    return () => window.removeEventListener('ttf-topic', onTopic)
  }, [])

  const index = Math.max(0, topics.findIndex((topic) => topic.id === activeId))
  const topic = topics[index]
  if (!topic) return null
  const topicMembers = members.filter((member) => member.topic === topic.id)

  return (
    <section id="topic" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.5em] text-brand-400">E 120° · 12 · TOPIC · 创作主题</p>
            <EditableText
              as="h1"
              value={topic.name}
              path={`topics.${index}.name`}
              className="mt-3 w-full font-display text-5xl tracking-[0.12em] text-parchment-100 lg:text-6xl"
            />
            <EditableText
              as="p"
              multiline
              value={topic.desc}
              path={`topics.${index}.desc`}
              className="mt-3 max-w-xl text-sm leading-relaxed text-parchment-400"
            />
            {(topic.keywords ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(topic.keywords ?? []).map((keyword) => (
                  <span key={keyword} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-parchment-400">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => requestScene(DIRECTORY_INDEX)}
            className="rounded-md border border-white/15 bg-ink-950/55 px-6 py-2.5 text-sm tracking-[0.2em] text-parchment-100 backdrop-blur-sm transition-all duration-300 hover:border-brand-500/60 hover:text-brand-400"
          >
            ← 返回创作主题
          </button>
        </div>

        <p className="scene-block mt-10 font-mono text-xs tracking-[0.35em] text-brand-400">
          作品与作者 · {topicMembers.length}
        </p>
        <div className="scene-block mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {topicMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                setActiveMemberId(member.id)
                requestScene(MEMBER_INDEX)
              }}
              className="group overflow-hidden rounded-lg border border-white/10 bg-ink-950/45 text-left backdrop-blur-sm transition-all duration-300 hover:border-brand-500/50"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={member.work.image}
                  alt={member.work.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <img src={member.avatar} alt="" loading="lazy" className="h-9 w-9 rounded-full border border-brand-500/50 bg-ink-900 object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-parchment-100">{member.name}</p>
                  <p className="truncate text-[10px] text-parchment-500">{member.work.title}</p>
                </div>
                <span className="ml-auto font-mono text-[10px] tracking-[0.15em] text-brand-400">进入 →</span>
              </div>
            </button>
          ))}
        </div>
        {topicMembers.length === 0 && (
          <p className="mt-8 text-sm text-parchment-500">该主题暂无作品（占位，后续补充）</p>
        )}
      </div>
    </section>
  )
}
