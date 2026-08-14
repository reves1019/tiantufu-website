import { site } from '../config/site'

/** 主导航页数量与各隐藏子页索引（子页不在侧边栏/顶部导航中，仅通过入口进入） */
export const MAIN_COUNT = site.nav.length
export const MEMBER_INDEX = MAIN_COUNT // 成员个人页
export const NEWS_INDEX = MAIN_COUNT + 1 // 社团新闻
export const CULTURE_INDEX = MAIN_COUNT + 2 // 社团文化
export const CONTEST_INDEX = MAIN_COUNT + 3 // 单图制图大赛
export const WORK_INDEX = MAIN_COUNT + 4 // 数码地球随机作品页
export const TOPIC_INDEX = MAIN_COUNT + 5 // 创作主题子页
export const JOIN_INDEX = MAIN_COUNT + 6 // 加入我们
export const COMMISSION_INDEX = MAIN_COUNT + 7 // 约稿服务
export const FAQ_INDEX = MAIN_COUNT + 8 // 常见问题
export const LEGAL_INDEX = MAIN_COUNT + 9 // 版权与免责
export const NEWS_DETAIL_INDEX = MAIN_COUNT + 10 // 新闻详情

export const HOME_INDEX = 0
export const ABOUT_INDEX = site.nav.findIndex((item) => item.href === '#about')
export const DIRECTORY_INDEX = site.nav.findIndex((item) => item.href === '#directory')
export const EARTH_INDEX = site.nav.findIndex((item) => item.href === '#earth')
export const WORKS_INDEX = site.nav.findIndex((item) => item.href === '#works')
export const CONTACT_INDEX = site.nav.length - 1
