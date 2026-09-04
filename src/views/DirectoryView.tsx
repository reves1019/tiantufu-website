import TiltCard from '../components/TiltCard'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { TOPIC_INDEX } from '../lib/pages'
import { setActiveTopicId } from '../lib/topicBus'
import { requestScene } from '../lib/sceneBus'

/** 创作主题索引：正史地图 / 半架空 / 全架空，点击进入主题子页 */
export default function DirectoryView() {
  const { content } = useContent()
  const topics = content.topics
  const members = content.members

  const coverFor = (topicId: string) => {
    const first = members.find((member) => member.topic === topicId)
    return first ? first.work.image : 'maps/map-01.jpg'
  }

  const countFor = (topicId: string) => members.filter((member) => member.topic === topicId).length

  return (
    <section id="directory" data-scroll-root className="relative h-full w-full overflow-y-auto">
      <div className="relative z-10 mx-auto w-full max-w-[1700px] px-8 pb-12 pt-24 lg:px-12">
        <div className="scene-block text-center">
          <p className="font-mono text-xs tracking-[0.5em] text-brand-400">
            E 120° · 03 · TOPICS · {content.ui.directory.title}
          </p>
          <h1 className="mt-4 font-display text-5xl tracking-[0.14em] text-parchment-100 lg:text-7xl">
            {content.ui.directory.title}
          </h1>
          <p className="mt-3 text-sm tracking-[0.2em] text-parchment-400">{content.ui.directory.subtitle}</p>
        </div>

        <div className="scene-block mt-12 grid gap-8 md:grid-cols-3">
          {topics.map((topic, i) => (
            <TiltCard key={topic.id} className="h-full">
              <button
                type="button"
                onClick={() => {
                  setActiveTopicId(topic.id)
                  requestScene(TOPIC_INDEX)
                }}
                className="group relative block h-full w-full overflow-hidden rounded-xl border border-white/10 bg-ink-950/45 text-left backdrop-blur-sm transition-all duration-300 hover:border-brand-500/50 hover:shadow-[0_0_36px_rgba(199,27,27,0.2)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
                  <img
                    src={coverFor(topic.id)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent" />
                  <span className="absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.3em] text-brand-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <EditableText
                    as="h3"
                    value={topic.name}
                    path={`topics.${i}.name`}
                    className="text-2xl tracking-[0.12em] text-parchment-100"
                  />
                  <EditableText
                    as="p"
                    multiline
                    value={topic.desc}
                    path={`topics.${i}.desc`}
                    className="mt-2 text-sm leading-relaxed text-parchment-500"
                  />
                  {(topic.keywords ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(topic.keywords ?? []).map((keyword) => (
                        <span key={keyword} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-parchment-500">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="mt-3 inline-block font-mono text-[10px] tracking-[0.2em] text-parchment-500 transition-colors group-hover:text-brand-400">
                    {countFor(topic.id)} {content.ui.directory.enterSuffix}
                  </span>
                </div>
              </button>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  )
}
