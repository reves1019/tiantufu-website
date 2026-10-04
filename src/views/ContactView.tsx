import { useRef, useState } from 'react'
import EditableText from '../components/admin/EditableText'
import { useContent } from '../lib/contentStore'
import { COMMISSION_INDEX, FAQ_INDEX, JOIN_INDEX, LEGAL_INDEX } from '../lib/pages'
import { requestScene } from '../lib/sceneBus'
import { useExhibitionMotion } from '../lib/useExhibitionMotion'

export default function ContactView() {
  const { content, admin, openGate } = useContent()
  const root = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState('')
  const [failed, setFailed] = useState(false)
  const contact = content.site.contact
  const ui = content.ui.contact
  const exhibit = content.ui.exhibition
  useExhibitionMotion(root, admin, 0)
  const entries = [{key:'joinCard',desc:'joinCardDesc',index:JOIN_INDEX,en:'JOIN THE HOUSE'},{key:'commissionCard',desc:'commissionCardDesc',index:COMMISSION_INDEX,en:'COMMISSION A MAP'},{key:'faqCard',desc:'faqCardDesc',index:FAQ_INDEX,en:'READ THE FAQ'},{key:'legalCard',desc:'legalCardDesc',index:LEGAL_INDEX,en:'COPYRIGHT & USE'}] as const
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
    <nav className="contact-actions">{entries.map((entry) => <button type="button" key={entry.key} onClick={() => requestScene(entry.index)} data-exhibit-reveal><div><span className="contact-action-en">{entry.en}</span><EditableText as="h2" value={ui[entry.key]} path={`ui.contact.${entry.key}`} /><EditableText as="p" value={ui[entry.desc]} path={`ui.contact.${entry.desc}`} className="reading-copy" /></div><span aria-hidden="true">↗</span></button>)}</nav>
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
