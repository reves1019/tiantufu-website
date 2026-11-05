import type { LightboxImage } from '../components/Lightbox'
import type { publicCatalog } from './publicCatalog'

/** Resolve the existing high-resolution source without changing stored image references. */
export function catalogueImage({ work, member, index }: ReturnType<typeof publicCatalog>[number]): LightboxImage {
  return { src: work.fullImage || (member?.work.image === work.image ? member.work.fullImage : undefined) || work.image,
    title: work.title, author: work.author, desc: work.desc, story: work.story, workKey: index < 0 && member ? `member:${member.id}` : `archive:${work.id}` }
}
