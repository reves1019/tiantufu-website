import type { Member, WorkItem } from '../config/site'

const demoMembers = new Set(['weilai-zhitu', 'changhe-lingtu', 'xingtu-yuanyu'])
const realSeedWorks = new Set(['w-shengming-1', 'w-shengxiong-1', 'w-baicai-1'])
const demoWorks = new Set(['w-shengming-2', 'w-shengxiong-2', 'w-baicai-2', 'w-weilai-1', 'w-weilai-2', 'w-changhe-1', 'w-changhe-2', 'w-xingtu-1', 'w-xingtu-2'])

/** Optional publication flags preserve old imports. Known sample records remain in the editor. */
export function isMemberPublished(member: Member) {
  return member.published ?? !demoMembers.has(member.id)
}
export function isWorkPublished(work: WorkItem) {
  return work.published ?? (realSeedWorks.has(work.id) || !demoWorks.has(work.id))
}

/**
 * Some legacy member records used the avatar as a temporary representative
 * image while the real map was still being prepared. Keep that portrait in
 * the author profile, but never present it as a map in public discovery.
 *
 * The description check keeps this compatible with older localStorage exports;
 * once a real work image is supplied the helper naturally returns false.
 */
export function isPortraitPlaceholderWork(work: Pick<WorkItem, 'image' | 'desc' | 'story'>, member?: Member) {
  if (!member || work.image !== member.avatar) return false
  const copy = `${work.desc ?? ''} ${work.story ?? ''}`
  return /作品图待上传|使用成员头像|头像作为临时封面/.test(copy)
}

export function publicCatalog(works: WorkItem[], members: Member[]) {
  return works.map((work, index) => ({ work, index, member: work.authorMemberId
    ? members.find((member) => member.id === work.authorMemberId)
    : members.find((member) => member.name === work.author) }))
    .filter(({ work, member }) => isWorkPublished(work) && (!member || isMemberPublished(member)) && !isPortraitPlaceholderWork(work, member))
}
