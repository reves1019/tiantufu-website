import { site } from '../config/site'
import { isMemberPublished, publicCatalog } from './publicCatalog'
import type { SiteContent } from './contentStore'
import {
  ABOUT_INDEX,
  COMMISSION_INDEX,
  CONTACT_INDEX,
  CONTEST_INDEX,
  CULTURE_INDEX,
  DIRECTORY_INDEX,
  EARTH_INDEX,
  JOIN_INDEX,
  LEGAL_INDEX,
  NEWS_DETAIL_INDEX,
  NEWS_INDEX,
  WORKS_INDEX,
} from './pages'

export type SearchEntry =
  | { id: string; type: 'page'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'news'; title: string; subtitle: string; haystack: string; target: { kind: 'news'; index: number } }
  | { id: string; type: 'member'; title: string; subtitle: string; haystack: string; target: { kind: 'member'; id: string } }
  | { id: string; type: 'work'; title: string; subtitle: string; haystack: string; target: { kind: 'work'; author: string } }
  | { id: string; type: 'topic'; title: string; subtitle: string; haystack: string; target: { kind: 'topic'; id: string } }
  | { id: string; type: 'faq'; title: string; subtitle: string; haystack: string; target: { kind: 'faq'; index: number } }
  | { id: string; type: 'contest'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'culture'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'join'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'commission'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'legal'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'earth'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }
  | { id: string; type: 'about'; title: string; subtitle: string; haystack: string; target: { kind: 'index'; index: number } }

export const SEARCH_TYPE_LABELS: Record<SearchEntry['type'], string> = {
  page: '页面',
  news: '新闻',
  member: '成员',
  work: '作品',
  topic: '主题',
  faq: '常见问题',
  contest: '赛事',
  culture: '文化',
  join: '加入我们',
  commission: '约稿服务',
  legal: '版权声明',
  earth: '数码地球',
  about: '年鉴',
}

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, '')

/** 构建全站可搜索索引：数据全部来自内容仓库（管理员修改后自动生效） */
export function buildSearchIndex(content: SiteContent): SearchEntry[] {
  const entries: SearchEntry[] = []

  site.nav.forEach((item, i) => {
    entries.push({
      id: `page-${item.href}`,
      type: 'page',
      title: item.label,
      subtitle: item.desc ?? '',
      haystack: norm(`${item.label} ${item.desc ?? ''} ${item.href}`),
      target: { kind: 'index', index: i },
    })
  })

  content.about.news.forEach((item, i) => {
    entries.push({
      id: `news-${i}`,
      type: 'news',
      title: item.title,
      subtitle: `${item.date ?? ''} · ${item.tag ?? '公告'}`,
      haystack: norm(`${item.title} ${item.desc ?? ''} ${item.body ?? ''} ${item.tag ?? ''} ${item.date ?? ''}`),
      target: { kind: 'news', index: i },
    })
  })

  content.members.filter(isMemberPublished).forEach((member) => {
    const works = [member.work, ...(member.works ?? [])]
    entries.push({
      id: `member-${member.id}`,
      type: 'member',
      title: member.name,
      subtitle: member.role,
      haystack: norm(
        `${member.name} ${member.role} ${member.bio} ${(member.tags ?? []).join(' ')} ${works.map((w) => `${w.title} ${w.desc}`).join(' ')}`,
      ),
      target: { kind: 'member', id: member.id },
    })
  })

  publicCatalog(content.worksArchive, content.members).forEach(({ work }) => {
    entries.push({
      id: `work-${work.id}`,
      type: 'work',
      title: work.title,
      subtitle: `${work.author} · ${content.topics.find((t) => t.id === work.topic)?.name ?? work.topic} · ${work.category}`,
      haystack: norm(`${work.title} ${work.author} ${work.desc} ${work.category} ${work.year ?? ''} ${content.topics.find((t) => t.id === work.topic)?.name ?? work.topic}`),
      target: { kind: 'work', author: work.author },
    })
  })

  content.topics.forEach((topic) => {
    entries.push({
      id: `topic-${topic.id}`,
      type: 'topic',
      title: topic.name,
      subtitle: (topic.keywords ?? []).join(' · '),
      haystack: norm(`${topic.name} ${topic.desc} ${(topic.keywords ?? []).join(' ')}`),
      target: { kind: 'topic', id: topic.id },
    })
  })

  content.faq.items.forEach((item, i) => {
    entries.push({
      id: `faq-${i}`,
      type: 'faq',
      title: item.q,
      subtitle: `${item.category} · 常见问题`,
      haystack: norm(`${item.category} ${item.q} ${item.a}`),
      target: { kind: 'faq', index: i },
    })
  })

  const contest = content.contest
  entries.push({
    id: 'contest-page',
    type: 'contest',
    title: contest.title,
    subtitle: contest.subtitle,
    haystack: norm(
      `${contest.title} ${contest.subtitle} ${contest.rules} ${contest.editions.map((e) => `${e.edition} ${e.year} ${e.participants} ${e.awards}`).join(' ')} ${
        contest.winners.map((w) => `${w.edition} ${w.names.join(' ')}`).join(' ')
      } ${(contest.works ?? []).map((w) => `${w.title} ${w.author} ${w.desc} ${w.edition}`).join(' ')}`,
    ),
    target: { kind: 'index', index: CONTEST_INDEX },
  })

  content.about.culture.forEach((item, i) => {
    entries.push({
      id: `culture-${i}`,
      type: 'culture',
      title: item.title,
      subtitle: '社团文化',
      haystack: norm(`${item.title} ${item.desc}`),
      target: { kind: 'index', index: CULTURE_INDEX },
    })
  })

  const join = content.join
  entries.push({
    id: 'join-page',
    type: 'join',
    title: join.title,
    subtitle: join.subtitle,
    haystack: norm(`${join.title} ${join.subtitle} ${join.intro} ${join.requirements.join(' ')} ${join.process.map((p) => `${p.step} ${p.desc}`).join(' ')}`),
    target: { kind: 'index', index: JOIN_INDEX },
  })

  const commission = content.commission
  entries.push({
    id: 'commission-page',
    type: 'commission',
    title: commission.title,
    subtitle: commission.subtitle,
    haystack: norm(
      `${commission.title} ${commission.subtitle} ${commission.intro} ${commission.steps.map((s) => `${s.title} ${s.desc}`).join(' ')} ${
        commission.notes
      } ${commission.priceNote} ${(commission.priceTable ?? []).map((p) => `${p.tier} ${p.scope} ${p.price} ${p.leadTime}`).join(' ')}`,
    ),
    target: { kind: 'index', index: COMMISSION_INDEX },
  })

  const legal = content.legal
  entries.push({
    id: 'legal-page',
    type: 'legal',
    title: legal.title,
    subtitle: legal.subtitle,
    haystack: norm(`${legal.title} ${legal.subtitle} ${legal.sections.map((s) => `${s.title} ${s.body}`).join(' ')}`),
    target: { kind: 'index', index: LEGAL_INDEX },
  })

  const earth = content.earth
  entries.push({
    id: 'earth-page',
    type: 'earth',
    title: earth.title,
    subtitle: earth.subtitle,
    haystack: norm(`${earth.title} ${earth.subtitle} ${earth.keywords.join(' ')}`),
    target: { kind: 'index', index: EARTH_INDEX },
  })

  entries.push({
    id: 'annals-page',
    type: 'about',
    title: '年鉴 · 重大事件',
    subtitle: '社团发展时间线',
    haystack: norm(`年鉴 重大事件 ${content.about.annals.map((a) => `${a.date} ${a.title} ${a.desc}`).join(' ')}`),
    target: { kind: 'index', index: ABOUT_INDEX },
  })

  // 目录/作品集/新闻/联系入口，保证关键词命中时也有页面出口
  entries.push(
    {
      id: 'entry-directory',
      type: 'page',
      title: '创作主题',
      subtitle: '正史地图 · 半架空 · 全架空',
      haystack: norm(`创作主题 正史地图 半架空 全架空 ${content.topics.map((t) => `${t.name} ${t.desc}`).join(' ')}`),
      target: { kind: 'index', index: DIRECTORY_INDEX },
    },
    {
      id: 'entry-works',
      type: 'page',
      title: '作品集',
      subtitle: '精选地图 · 架空世界 · 历史复原',
      haystack: norm(`作品集 精选地图 架空世界 历史复原 文件夹`),
      target: { kind: 'index', index: WORKS_INDEX },
    },
    {
      id: 'entry-news',
      type: 'page',
      title: '新闻动态',
      subtitle: '社团公告与活动',
      haystack: norm(`新闻动态 社团公告 活动`),
      target: { kind: 'index', index: NEWS_INDEX },
    },
    {
      id: 'entry-contact',
      type: 'page',
      title: '联系天图府',
      subtitle: 'QQ · B站 · 邮箱',
      haystack: norm(`联系 联系我们 QQ B站 邮箱 加入我们 约稿服务 常见问题 版权`),
      target: { kind: 'index', index: CONTACT_INDEX },
    },
    {
      id: 'entry-news-detail',
      type: 'page',
      title: '新闻详情',
      subtitle: '单条新闻正文',
      haystack: norm(`新闻详情 正文`),
      target: { kind: 'index', index: NEWS_DETAIL_INDEX },
    },
  )

  return entries
}

/** 搜索打分：标题命中 > 副标题命中 > 正文包含，越靠前权重越高 */
export function searchEntries(entries: SearchEntry[], query: string) {
  const q = norm(query)
  if (!q) return []
  const scored = entries
    .map((entry) => {
      let score = 0
      if (norm(entry.title).includes(q)) score += 5
      if (norm(entry.subtitle).includes(q)) score += 3
      const idx = entry.haystack.indexOf(q)
      if (idx >= 0) score += 2 + (idx === 0 ? 1 : 0)
      return { entry, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.map((item) => item.entry)
}
