import type { Member, WorkItem } from '../config/site'
import { isMemberPublished, isPortraitPlaceholderWork, publicCatalog } from './publicCatalog.ts'

/** One public catalogue for discovery, home and the gallery. Archive publication always wins. */
export function exhibitionCatalog(works: WorkItem[], members: Member[], category: string) {
  const catalogue = publicCatalog(works, members)
  const representatives = members.filter(isMemberPublished).filter((member) => !works.some((work) =>
    (work.authorMemberId ? work.authorMemberId === member.id : work.author === member.name) && work.image === member.work.image))
    .map((member) => ({ member, index: -1, work: { id: `member-${member.id}`, ...member.work,
      author: member.name, authorMemberId: member.id, topic: member.work.topic ?? member.topic, category: member.work.category ?? category } as WorkItem }))
  return [...catalogue, ...representatives.filter(({ work, member }) => !isPortraitPlaceholderWork(work, member))]
}
