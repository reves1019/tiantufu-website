import { useEffect, useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { COMMISSION_INDEX, DIRECTORY_INDEX, FAQ_INDEX, JOIN_INDEX, LEGAL_INDEX, WORKS_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'

const CONTACT_ENTRIES = [
  { key: 'joinCard', titleKey: 'joinCard', descKey: 'joinCardDesc', section: 'contact', index: JOIN_INDEX, en: 'JOIN THE HOUSE' },
  { key: 'commissionCard', titleKey: 'commissionCard', descKey: 'commissionCardDesc', section: 'contact', index: COMMISSION_INDEX, en: 'COMMISSION A MAP' },
  { key: 'faqCard', titleKey: 'faqCard', descKey: 'faqCardDesc', section: 'contact', index: FAQ_INDEX, en: 'READ THE FAQ' },
  { key: 'legalCard', titleKey: 'legalCard', descKey: 'legalCardDesc', section: 'contact', index: LEGAL_INDEX, en: 'COPYRIGHT & USE' },
  { key: 'archiveCard', titleKey: 'archiveTitle', descKey: 'archiveNote', section: 'works', index: WORKS_INDEX, en: 'WORKS ARCHIVE' },
  { key: 'authorsCard', titleKey: 'authorPage', descKey: 'openHint', section: 'works', index: DIRECTORY_INDEX, en: 'FIELD NOTES' },
] as const
type ContactEntryKey = (typeof CONTACT_ENTRIES)[number]['key']
const CONTACT_ENTRY_ORDER = CONTACT_ENTRIES.map((entry) => entry.key)

export default function ContactView() {
  const { content, admin, openGate } = useContent()
  const root = useRef<HTMLElement>(null)
  const actionsRef = useRef<HTMLElement>(null)
  const pendingFlip = useRef<Map<ContactEntryKey, DOMRect> | null>(null)
  const suppressClick = useRef(false)
  const lastHoverMove = useRef('')
  const [copied, setCopied] = useState('')
  const [failed, setFailed] = useState(false)
  const contact = content.site.contact
  const ui = content.ui.contact
  const worksUi = content.ui.works
  const exhibit = content.ui.exhibition
  useExhibitionMotion(root, admin, 0)
  const entries = CONTACT_ENTRIES
  const defaultOrder = CONTACT_ENTRY_ORDER
  const [entryOrder, setEntryOrder] = useState<ContactEntryKey[]>(defaultOrder)
  const [draggedEntry, setDraggedEntry] = useState<ContactEntryKey | null>(null)
  const [dragOverEntry, setDragOverEntry] = useState<ContactEntryKey | null>(null)
  const entryByKey = new Map(entries.map((entry) => [entry.key, entry]))
  const orderedEntries = entryOrder.reduce<(typeof entries)[number][]>((result, key) => {
    const entry = entryByKey.get(key)
    if (entry) result.push(entry)
    return result
  }, [])
  const entryText = (entry: (typeof CONTACT_ENTRIES)[number], kind: 'title' | 'desc') => {
    const key = kind === 'title' ? entry.titleKey : entry.descKey
    return entry.section === 'contact'
      ? ui[key as keyof typeof ui]
      : worksUi[key as keyof typeof worksUi]
  }
  const entryPath = (entry: (typeof CONTACT_ENTRIES)[number], kind: 'title' | 'desc') => {
    const key = kind === 'title' ? entry.titleKey : entry.descKey
    return entry.section === 'contact' ? `ui.contact.${key}` : `ui.works.${key}`
  }

  useEffect(() => {
    const before = pendingFlip.current
    if (!before || !actionsRef.current) return
    const frame = requestAnimationFrame(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pendingFlip.current = null
        return
      }
      actionsRef.current?.querySelectorAll<HTMLElement>('[data-contact-key]').forEach((element) => {
        const key = element.dataset.contactKey as ContactEntryKey
        const previous = before.get(key)
        if (!previous) return
        const current = element.getBoundingClientRect()
        const deltaX = previous.left - current.left
        const deltaY = previous.top - current.top
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return
        element.animate([
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(.96)`, offset: 0 },
          { transform: 'translate(0, 0) scale(1)', offset: 1 },
        ], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' })
      })
      pendingFlip.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [entryOrder])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ttf-contact-action-order') ?? 'null')
      if (Array.isArray(saved) && defaultOrder.every((key) => saved.includes(key))) {
        setEntryOrder(defaultOrder.filter((key) => saved.includes(key)).map((key) => saved.indexOf(key)).sort((a, b) => a - b).map((index) => saved[index]) as ContactEntryKey[])
      }
    } catch {
      // A stale or malformed layout should never prevent the contact page from rendering.
    }
  }, [defaultOrder])

  const moveEntry = (from: ContactEntryKey, to: ContactEntryKey) => {
    if (from === to) return
    if (actionsRef.current) {
      pendingFlip.current = new Map(Array.from(actionsRef.current.querySelectorAll<HTMLElement>('[data-contact-key]')).map((element) => [element.dataset.contactKey as ContactEntryKey, element.getBoundingClientRect()]))
    }
    setEntryOrder((current) => {
      const next = [...current]
      const fromIndex = next.indexOf(from)
      const toIndex = next.indexOf(to)
      if (fromIndex < 0 || toIndex < 0) return current
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, from)
      try { localStorage.setItem('ttf-contact-action-order', JSON.stringify(next)) } catch { /* local layout persistence is optional */ }
      return next
    })
  }
  const channels = [
    {key:'qq',label:ui.qqLabel,note:ui.qqNote,value:contact.qq,href:`tencent://message/?uin=${contact.qq}`},
    {key:'qqGroup',label:ui.groupLabel,note:ui.groupNote,value:contact.qqGroup,href:`tencent://group/pa?cmd=2&uin=${contact.qqGroup}`},
    {key:'email',label:ui.emailLabel,note:ui.emailNote,value:contact.email,href:`mailto:${contact.email}`},
    {key:'bilibili',label:ui.biliLabel,note:ui.biliNote,value:contact.bilibili,href:contact.bilibili},
  ]
  const copy = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); setFailed(false) } catch { setFailed(true) }
  }
  return <section ref={root} id="contact" data-scroll-root className="atlas-night editorial-page relative h-full w-full overflow-y-auto overflow-x-hidden"><div className="editorial-container">
    <header className="editorial-centered"><EditableText as="h1" value={ui.title} path="ui.contact.title" className="editorial-title mx-auto w-full max-w-6xl" /><EditableText as="p" value={exhibit.contactIntro} path="ui.exhibition.contactIntro" className="reading-copy" /></header>
    <nav ref={actionsRef} className="contact-actions" aria-label="Contact actions">
      {orderedEntries.map((entry) => <button
        type="button"
        key={entry.key}
        draggable
        className={`contact-action-card contact-action-card--${entry.key} ${draggedEntry === entry.key ? 'is-dragging' : ''} ${dragOverEntry === entry.key ? 'is-drag-over' : ''}`}
        data-contact-key={entry.key}
        onClick={(event) => { if (suppressClick.current) { event.preventDefault(); suppressClick.current = false; return } requestScene(entry.index) }}
        onDragStart={(event) => { suppressClick.current = true; lastHoverMove.current = ''; setDraggedEntry(entry.key); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', entry.key) }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setDragOverEntry(entry.key)
          const source = (event.dataTransfer.getData('text/plain') || draggedEntry) as ContactEntryKey | null
          if (!source || source === entry.key) return
          const marker = `${source}:${entry.key}`
          if (lastHoverMove.current === marker) return
          lastHoverMove.current = marker
          moveEntry(source, entry.key)
        }}
        onDragLeave={() => setDragOverEntry((current) => current === entry.key ? null : current)}
        onDrop={(event) => { event.preventDefault(); const source = (event.dataTransfer.getData('text/plain') || draggedEntry) as ContactEntryKey | null; if (source) moveEntry(source, entry.key); setDraggedEntry(null); setDragOverEntry(null) }}
        onDragEnd={() => { setDraggedEntry(null); setDragOverEntry(null); lastHoverMove.current = ''; window.setTimeout(() => { suppressClick.current = false }, 160) }}
        onKeyDown={(event) => {
          if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          const index = entryOrder.indexOf(entry.key)
          const offset = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
          const target = entryOrder[index + offset]
          if (target) moveEntry(entry.key, target)
        }}
        data-exhibit-reveal
        aria-label={`${entry.en} · ${entryText(entry, 'title')}. 按住拖动重新排列，Alt 加方向键移动`}
      >
        <span className="contact-action-grip" aria-hidden="true">⋮⋮</span>
        <span className="contact-action-copy"><span className="contact-action-en">{entry.en}</span><EditableText as="h2" value={entryText(entry, 'title')} path={entryPath(entry, 'title')} /><EditableText as="p" value={entryText(entry, 'desc')} path={entryPath(entry, 'desc')} className="reading-copy" /></span>
        <span className="contact-action-arrow" aria-hidden="true">↗</span>
      </button>)}
    </nav>
    <section className="contact-channels"><EditableText as="h2" value={exhibit.contactChannels} path="ui.exhibition.contactChannels" /><div>{channels.map((channel) => {
      const pending = !channel.value.trim() || /^0+$/.test(channel.value) || /占位|待确认|待替换/.test(channel.note)
      const prefix = channel.key === 'qqGroup' ? 'group' : channel.key === 'bilibili' ? 'bili' : channel.key
      return <article key={channel.key}><EditableText as="h3" value={channel.label} path={`ui.contact.${prefix}Label`} /><EditableText as="p" value={channel.value} path={`site.contact.${channel.key}`} /><EditableText as="p" value={channel.note} path={`ui.contact.${prefix}Note`} className="contact-channel-note" />{pending ? <span className="editorial-pending">{exhibit.contactPending}</span> : <div className="contact-channel-buttons"><a href={channel.href} target={channel.key === 'bilibili' ? '_blank' : undefined} rel="noreferrer">{channel.label} ↗</a><button type="button" onClick={() => copy(channel.key, channel.value)}>{copied === channel.key ? exhibit.contactCopied : exhibit.copyContact}</button></div>}</article>
    })}</div><p role="status" className="contact-copy-status">{failed ? exhibit.copyFailed : copied ? exhibit.contactCopied : ''}</p></section>
    <div className="contact-socials">{contact.socials.map((social, i) => {
      const available = /^https?:\/\//.test(social.url) && !['https://space.bilibili.com/','https://weibo.com/','https://www.xiaohongshu.com/'].includes(social.url)
      return available ? <a key={i} href={social.url} target="_blank" rel="noreferrer"><EditableText as="span" value={social.label} path={`site.contact.socials.${i}.label`} /> ↗</a> : <span key={i}><EditableText as="span" value={social.label} path={`site.contact.socials.${i}.label`} /> · {exhibit.contactPending}</span>
    })}</div>
    <footer className="contact-footer"><p><EditableText as="span" value={ui.copyrightPrefix} path="ui.contact.copyrightPrefix" /> {new Date().getFullYear()} · {content.site.name}<EditableText as="span" value={ui.copyrightSuffix} path="ui.contact.copyrightSuffix" /></p><button type="button" onClick={openGate} title={ui.accountLoginHint}>{ui.accountLogin}</button><EditableText as="p" value={ui.keyboardHint} path="ui.contact.keyboardHint" /></footer>
  </div></section>
}
