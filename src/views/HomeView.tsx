import { useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import EditableText from '../components/admin/EditableText'
import Lightbox from '../components/Lightbox'
import { useContent } from '../lib/contentStore'
import { ABOUT_INDEX, EARTH_INDEX, JOIN_INDEX, MEMBER_INDEX, TOPIC_INDEX, WORKS_INDEX } from '../lib/pages'
import { isMemberPublished } from '../lib/publicCatalog'
import { exhibitionCatalog } from '../lib/exhibitionCatalog'
import { setActiveMemberId } from '../lib/memberBus'
import { setActiveTopicId } from '../lib/topicBus'
import { requestScene } from '../lib/sceneBus'
import { catalogueImage } from '../lib/catalogueImage'
import { CircularGallery } from '../components/ui/circular-gallery'
import { FlowButton } from '../components/ui/flow-button'
import ScrollBaseAnimation from '../components/ui/scroll-text-marquee'
import { ReviewMarquee, type ReviewMarqueeItem } from '../components/ui/review-marquee'
import { MapBadgeWindow } from '../components/ui/map-badge-window'
import { brandAssets, heroConfig } from '../config/site'
import { clearSpotlight, updateSpotlight } from '../components/Spotlight'
import ScrollAnimation from '../components/ui/scroll-animation'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const topicActionLabels: Record<string, string> = {
  zhengshi: 'HISTORICAL MAPS',
  'ban-jiakong': 'ALTERNATE HISTORY',
  'quan-jiakong': 'IMAGINED WORLDS',
}

export default function HomeView() {
  const { content, admin } = useContent()
  const root = useRef<HTMLElement>(null)
  const [reading, setReading] = useState<number | null>(null)
  const [topicId, setTopicId] = useState(content.topics[0]?.id ?? '')
  const [authorIndex, setAuthorIndex] = useState(0)
  const maps = useMemo(() => exhibitionCatalog(content.worksArchive, content.members, content.ui.member.representative), [content.worksArchive, content.members, content.ui.member.representative])
  const authors = useMemo(() => content.members.filter(isMemberPublished), [content.members])
  const author = authors[Math.min(authorIndex, authors.length - 1)]
  const reviewItems: ReviewMarqueeItem[] = useMemo(() => authors.map((member, index) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    avatar: member.avatar,
    index: `FIELD NOTE / ${String(index + 1).padStart(2, '0')}`,
    body: member.signature?.trim() || (member.bio && !member.bio.includes('占位') ? member.bio : '从一条经线开始，记录一段仍在展开的山河。'),
  })), [authors])
  const ui = content.ui.exhibition
  const images = maps.map(catalogueImage)

  useGSAP(() => {
    if (admin || !root.current) return
    const media = gsap.matchMedia()
    media.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.utils.toArray<HTMLElement>('.exhibit-hero-map .exhibit-map-cover, .circular-gallery', root.current).forEach((image) => {
        gsap.fromTo(image, { y: 24, opacity: .6 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: {
          trigger: image, scroller: root.current, start: 'top 92%', end: 'top 45%', scrub: .6,
        } })
      })
      gsap.fromTo('.exhibit-manifesto span', { opacity: .3 }, { opacity: 1, stagger: .15, ease: 'none', scrollTrigger: {
        trigger: '.exhibit-manifesto', scroller: root.current, start: 'top 88%', end: 'top 45%', scrub: .6,
      } })
    })
    return () => media.revert()
  }, { scope: root, dependencies: [maps.length, admin], revertOnUpdate: true })

  const openTopic = (id: string) => { setActiveTopicId(id); requestScene(TOPIC_INDEX) }
  return <section ref={root} id="home" className="exhibit-page relative h-full w-full overflow-y-auto overflow-x-hidden" data-scroll-root>
    <div className="exhibit-container">
      <header className="exhibit-hero">
        <ScrollAnimation direction="left" viewport={{ amount: 0.3, margin: '0px 0px -8% 0px' }} disabled={admin}>
          <EditableText as="h1" value={ui.title} path="ui.exhibition.title" multiline className="exhibit-title mx-auto w-full max-w-6xl" />
        </ScrollAnimation>
        <ScrollAnimation direction="left" viewport={{ amount: 0.3, margin: '0px 0px -8% 0px' }} disabled={admin}>
          <EditableText as="p" value={ui.intro} path="ui.exhibition.intro" multiline className="exhibit-intro" />
        </ScrollAnimation>
        <ScrollAnimation direction="up" viewport={{ amount: 0.25 }} disabled={admin}>
          <div className="exhibit-actions">
            <FlowButton variant="solid" text="EXPLORE MAPS" aria-label={content.ui.home.primaryCta} onClick={() => requestScene(WORKS_INDEX)} />
            <FlowButton text="ABOUT TIANTUFU" aria-label={content.ui.home.aboutLabel} onClick={() => requestScene(ABOUT_INDEX)} />
          </div>
        </ScrollAnimation>
        {maps[0] ? <figure className="exhibit-hero-map">
          <button type="button" className="exhibit-map-cover" aria-label={ui.readMap + '：' + maps[0].work.title} onClick={() => setReading(0)}>
            <img src={maps[0].work.image} alt={maps[0].work.title} loading="eager" decoding="async" />
            <span className="exhibit-image-action">{ui.readMap} ↗</span>
          </button>
          <figcaption><span>{maps[0].work.title}</span><span className="exhibit-map-meta">NO.01 · {maps[0].work.year ?? maps[0].work.category} · {maps[0].work.author}</span></figcaption>
        </figure> : <p className="exhibit-empty">{ui.empty}</p>}
      </header>

      {maps[0] && <MapBadgeWindow
        mapSrc={content.media.maps[0] ?? heroConfig.maps.srcs[0]}
        badgeSrc={brandAssets.badgeWindow}
        label={ui.badgeWindow.label}
        meta={ui.badgeWindow.eyebrow}
        footerLabel={ui.badgeWindow.footer}
        footerHint={ui.badgeWindow.scrollHint}
        coordinate={ui.badgeWindow.coordinate}
      />}

      <section className="exhibit-marquee" aria-label="地图叙事关键词">
        <ScrollBaseAnimation baseVelocity={-2.2} delay={350} label="历史疆域 · 复古地图 · 架空叙事 · 世界构建 · HISTORICAL FRONTIERS · VINTAGE CARTOGRAPHY · FICTIONAL NARRATIVES · WORLD BUILDING">历史疆域 · 复古地图 · 架空叙事 · 世界构建 · HISTORICAL FRONTIERS · VINTAGE CARTOGRAPHY · FICTIONAL NARRATIVES · WORLD BUILDING</ScrollBaseAnimation>
        <ScrollBaseAnimation baseVelocity={1.7} delay={700} className="exhibit-marquee-secondary" label="沿经纬阅读山河 · 让每一幅地图继续讲述 · READ THE LAND · LET EVERY MAP TELL ITS STORY">沿经纬阅读山河 · 让每一幅地图继续讲述 · READ THE LAND · LET EVERY MAP TELL ITS STORY</ScrollBaseAnimation>
      </section>

      <ScrollAnimation direction="left" viewport={{ amount: 0.2 }} disabled={admin}>
      <section className="exhibit-chapter" aria-label={ui.featuredTitle}>
        <div className="exhibit-heading"><EditableText as="h2" value={ui.featuredTitle} path="ui.exhibition.featuredTitle" /><button type="button" onClick={() => requestScene(EARTH_INDEX)}>{ui.explore} ↗</button></div>
        <CircularGallery variant="accordion" items={maps.slice(0, 8).map(({ work }) => ({ id: work.id, common: work.title, binomial: work.category, photo: { url: work.image, text: work.title, by: work.author } }))} labels={ui.circularGallery} autoRotateSpeed={admin || reading !== null ? 0 : 3} onSelect={setReading} />
      </section>
      </ScrollAnimation>

      <ScrollAnimation direction="right" viewport={{ amount: 0.16 }} disabled={admin}>
      <section className="exhibit-chapter" aria-label={ui.themesTitle}>
        <div className="exhibit-heading"><EditableText as="h2" value={ui.themesTitle} path="ui.exhibition.themesTitle" /></div>
        <div className="exhibit-topics">
          {content.topics.map((topic, index) => {
            const cover = maps.find(({ member, work }) => (work.topic || member?.topic) === topic.id)
            const selected = topicId === topic.id
            return <article key={topic.id} className={`${selected ? 'is-active ' : ''}spotlight-surface exhibit-topic-card`} onMouseEnter={() => setTopicId(topic.id)} onFocus={() => setTopicId(topic.id)} onPointerMove={updateSpotlight} onPointerLeave={clearSpotlight}>
              <button type="button" className="exhibit-topic-cover" onClick={() => openTopic(topic.id)} aria-label={ui.explore + '：' + topic.name}>
                <span className="exhibit-topic-figure">
                  {cover && <img src={cover.work.image} alt="" loading="lazy" />}
                  <span className="exhibit-topic-wash" aria-hidden="true" />
                </span>
                <span className="exhibit-topic-action">{topicActionLabels[topic.id] ?? 'EXPLORE THEME'} <b aria-hidden="true">↗</b></span>
              </button>
              <div className="exhibit-topic-body">
                <EditableText as="h3" value={topic.name} path={'topics.' + index + '.name'} />
                <EditableText as="p" value={topic.desc} path={'topics.' + index + '.desc'} multiline />
                <button type="button" className="exhibit-topic-more" onClick={() => openTopic(topic.id)}>EXPLORE TOPIC <b aria-hidden="true">→</b></button>
              </div>
            </article>
          })}
        </div>
      </section>
      </ScrollAnimation>

      {author && <ScrollAnimation direction="up" viewport={{ amount: 0.16 }} disabled={admin}><section className="exhibit-chapter exhibit-author" aria-label={ui.authorsTitle}>
        <div><EditableText as="h2" value={ui.authorsTitle} path="ui.exhibition.authorsTitle" />
          <div className="exhibit-portraits">{authors.map((person, index) => <button key={person.id} type="button" aria-label={person.name} aria-pressed={authorIndex === index} onClick={() => setAuthorIndex(index)}><img src={person.avatar} alt={person.name} loading="lazy" /></button>)}</div>
        </div>
        <div><h3>{author.name}</h3><p>{author.role}</p><button type="button" className="exhibit-text-link" onClick={() => { setActiveMemberId(author.id); requestScene(MEMBER_INDEX) }}>{ui.authorPage} ↗</button></div>
      </section></ScrollAnimation>}
      {reviewItems.length > 0 && <ScrollAnimation direction="right" viewport={{ amount: 0.14 }} disabled={admin}><section className="exhibit-chapter exhibit-voices" aria-label="制图者手记">
        <div className="exhibit-heading"><h2>制图者手记</h2><span className="exhibit-map-meta">FIELD NOTES · {String(reviewItems.length).padStart(2, '0')}</span></div>
        <div className="exhibit-voices-stage">
          <ReviewMarquee items={reviewItems} trailImages={maps.slice(0, 5).map(({ work }) => work.image)} />
        </div>
      </section></ScrollAnimation>}
      <ScrollAnimation direction="up" viewport={{ amount: 0.12 }} disabled={admin}><footer className="exhibit-chapter exhibit-footer">
        <p className="exhibit-manifesto">{ui.manifesto.split('，').map((phrase, index) => <span key={index}>{phrase}{index < ui.manifesto.split('，').length - 1 ? '，' : ''}</span>)}</p>
        <FlowButton variant="solid" text="JOIN THE HOUSE" aria-label={content.ui.home.secondaryCta} onClick={() => requestScene(JOIN_INDEX)} />
        <button type="button" className="exhibit-text-link" onClick={() => window.dispatchEvent(new Event('ttf-intro-open'))}>{ui.watchIntro}</button>
        <div className="exhibit-colophon"><img src={content.media.brand.emblem} alt="" loading="lazy" /><span>{content.site.name} · {content.site.slogan}</span></div>
      </footer></ScrollAnimation>
    </div>
    {reading !== null && images[reading] && <Lightbox images={images} index={reading} onIndexChange={setReading} onClose={() => setReading(null)} />}
  </section>
}
