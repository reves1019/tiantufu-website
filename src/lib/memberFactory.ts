import type { Member, WorkItem } from '../config/site'
import type { AccountRecord } from './accounts'

/** 审核通过后生成可进入的成员主页与代表作卡片。 */
export function makeApprovedMemberCard(
  account: AccountRecord,
  topic: string,
  fallbackAvatar: string,
  fallbackWorkImage: string,
): Member {
  const name = account.displayName.trim() || account.username
  return {
    id: `member-${account.id}`,
    name,
    role: '制图师 · 社团成员（待完善）',
    topic,
    avatar: account.avatar || fallbackAvatar,
    bio: account.bio?.trim() || '成员个人简介占位：欢迎来到我的主页，介绍待完善。',
    tags: ['成员'],
    work: {
      title: '我的代表作（占位）',
      image: fallbackWorkImage,
      desc: '作品说明占位：审核通过后由管理员完善；成员可自行编辑头像、昵称和个人介绍。',
    },
    works: [],
  }
}

/** 账号审核与首页内容在同一 IndexedDB 事务前组装，重复执行不会重复建卡。 */
export function attachApprovedMember(
  members: Member[],
  worksArchive: WorkItem[],
  card: Member,
  topic: string,
): { members: Member[]; worksArchive: WorkItem[] } {
  const nextMembers = members.some((member) => member.id === card.id) ? members : [...members, card]
  const workId = `wa-${card.id}`
  const nextWorks = worksArchive.some((work) => work.id === workId)
    ? worksArchive
    : [
        ...worksArchive,
        {
          id: workId,
          title: card.work.title,
          author: card.name,
          authorMemberId: card.id,
          image: card.work.image,
          desc: card.work.desc,
          topic,
          category: '历史地图',
        },
      ]
  return { members: nextMembers, worksArchive: nextWorks }
}
