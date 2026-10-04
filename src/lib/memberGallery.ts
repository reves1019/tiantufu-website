import type { Member, WorkItem } from '../config/site'
import { isPortraitPlaceholderWork, isWorkPublished } from './publicCatalog.ts'

export interface MemberGalleryEntry {
  id: string
  work: Member['work'] & { story?: string }
  titlePath: string
  descPath: string
  path: string
}

/** Stable author IDs take precedence over display names; never expose archived drafts by fallback. */
export function memberGallery(member: Member, memberIndex: number, works: WorkItem[], includeDrafts = false): MemberGalleryEntry[] {
  const own = works.map((work, index) => ({ work, index })).filter(({ work }) =>
    work.authorMemberId ? work.authorMemberId === member.id : work.author === member.name)
  const gallery: MemberGalleryEntry[] = own.filter(({ work }) => (includeDrafts || isWorkPublished(work)) && !isPortraitPlaceholderWork(work, member)).map(({ work, index }) => ({
    id: work.id, work: { ...work, fullImage: work.fullImage || (work.image === member.work.image ? member.work.fullImage : undefined) },
    titlePath: `worksArchive.${index}.title`, descPath: `worksArchive.${index}.desc`,
    path: `worksArchive.${index}`,
  }))
  const covered = (image: string) => own.some(({ work }) => work.image === image) || gallery.some((entry) => entry.work.image === image)
  if (!covered(member.work.image) && !isPortraitPlaceholderWork(member.work as WorkItem, member)) gallery.unshift({ id: `representative-${member.id}`, work: { ...member.work, topic: member.work.topic ?? member.topic },
    titlePath: `members.${memberIndex}.work.title`, descPath: `members.${memberIndex}.work.desc`, path: `members.${memberIndex}.work` })
  else {
    const representative = gallery.findIndex((entry) => entry.work.image === member.work.image)
    if (representative > 0) gallery.unshift(...gallery.splice(representative, 1))
  }
  ;(member.works ?? []).forEach((work, index) => {
    if (covered(work.image) || (!includeDrafts && work.title.includes('占位'))) return
    gallery.push({ id: `member-${member.id}-${index}`, work: { ...work, topic: work.topic ?? member.topic },
      titlePath: `members.${memberIndex}.works.${index}.title`, descPath: `members.${memberIndex}.works.${index}.desc`, path: `members.${memberIndex}.works.${index}` })
  })
  return gallery
}
