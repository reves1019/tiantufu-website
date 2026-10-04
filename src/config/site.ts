import wordmarkHorizontal from '../assets/brand/wordmark-horizontal.png'
import emblemSeal from '../assets/brand/emblem-seal.png'
import lockupHorizontal from '../assets/brand/lockup-horizontal.png'
import emblemRound from '../assets/brand/emblem-round.png'
import badgeWindow from '../assets/brand/badge-window.png'
import sealSquare from '../assets/brand/seal-square.png'
import avatarShengming from '../assets/members/avatar.webp'
import workShengming from '../assets/members/work-near-east-1045.webp'
import avatarShengxiong from '../assets/members/shengxiong-avatar.webp'
import workShengxiong from '../assets/members/shengxiong-work.webp'
import avatarBaicai from '../assets/members/baicai-avatar.webp'
import workBaicai from '../assets/members/baicai-work.webp'
import avatarGebiYinhe from '../assets/members/gebi-lao-yinhe-avatar.jpg'
import avatarHelietis from '../assets/members/helietis-avatar.jpg'
import avatarTopiatsiak from '../assets/members/topiatsiak-avatar.png'
import workTopiatsiak1 from '../assets/members/topiatsiak-work-01.png'
import workTopiatsiak2 from '../assets/members/topiatsiak-work-02.png'
import workTopiatsiak3 from '../assets/members/topiatsiak-work-03.jpg'

/** 站点基础信息：后续替换文案只需改这里 */
export const site = {
  name: '天图府',
  nameEn: 'TIANTUFU',
  slogan: '探索无限可能',
  overline: '架空历史地图 · 架空世界构建',
  nav: [
    { label: '首页', href: '#home', desc: '回到起点 · 探索从这里开始' },
    { label: '社团介绍', href: '#about', desc: '认识天图府 · 架空世界构建者社团' },
    { label: '创作主题', href: '#directory', desc: '正史地图 · 半架空 · 全架空' },
    { label: '地图探索', href: '#earth', desc: '翻阅作品，阅读山河与故事' },
    { label: '作品集', href: '#works', desc: '精选地图作品 · 即将开放' },
    { label: '联系', href: '#contact', desc: '联系我们 · QQ / B 站 / 邮箱' },
  ],
  contact: {
    qq: '000000000', // TODO: 替换为社团 QQ
    qqGroup: '000000000', // TODO: 替换为 QQ 群号
    bilibili: 'https://space.bilibili.com/', // TODO: 替换为 B 站主页
    email: 'hello@tiantufu.com', // TODO: 待确认
    socials: [
      { label: 'B站', url: 'https://space.bilibili.com/' }, // TODO: 替换
      { label: '微博', url: 'https://weibo.com/' }, // TODO: 替换
      { label: '小红书', url: 'https://www.xiaohongshu.com/' }, // TODO: 替换
    ],
  },
}

/** 品牌视觉资源：替换 Logo 时只需覆盖 src/assets/brand 下的同名文件 */
export const brandAssets = {
  wordmark: wordmarkHorizontal, // 导航栏 / 页眉横排文字 Logo
  emblem: emblemSeal, // Hero 中央印章风徽标
  lockup: lockupHorizontal, // 完整组合 Logo（备用）
  emblemRound: emblemRound, // 圆形徽标（备用）
  seal: sealSquare, // 方印（备用）
  badgeWindow: badgeWindow, // 透明徽章轮廓，用于复古地图窗口
}

/** Hero 背景配置：片头视频 + 地图网格动画 */
export const heroConfig = {
  video: {
    enabled: true,
    src: 'brand/tiantufu-intro.mp4',
    opacity: 0.3,
    loop: false, // 片头视频只播放一次，不循环
    fadeOutOnEnd: true, // 播完后淡出，露出经纬网格 + 粒子背景
    // 说明：如果 片头.mp4 实际是字幕片头而非地图背景，
    // 把 enabled 改为 false 即可自动切回纯 CSS 经纬网格 + 粒子背景。
  },
  maps: {
    enabled: true,
    // 复古地图素材（公有领域，Wikimedia Commons），作为后续页面背景板自动轮播
    srcs: [
      'maps/map-01.jpg', // 奥泰利乌斯《寰宇大观》1572
      'maps/map-02.jpg', // 布劳《新世界全图》1664
      'maps/map-03.jpg', // 瓦尔德泽米勒世界地图 1507
      'maps/map-04.jpg', // 墨卡托世界地图 1569
      'maps/map-05.jpg', // 亚洲古图 1650
      'maps/map-06.jpg', // 德安维尔《中国全图》1735
    ],
    intervalMs: 10000, // 每张停留时长（更慢，突出细节）
    fadeMs: 2000, // 淡入淡出切换时长（更平滑）
  },
}

/** 与内容一同保存、导出和同步的视觉素材；旧 JSON 自动补齐默认值。 */
export const mediaContent = {
  brand: { ...brandAssets },
  maps: [...heroConfig.maps.srcs],
}

/** 首页建筑文字帘：原创透明建筑素材与每个主题的叙事文案。 */
export const homeAtlasContent = {
  interactionHint: '轻触文字，拨开一段山河。',
  previousLabel: '上一个创作主题',
  nextLabel: '下一个创作主题',
  exploreLabel: '探索这个主题',
  scenes: [
    {
      id: 'history', topicId: 'zhengshi', roof: 'atlas/roof-imperial-v1.png',
      kicker: '正史地图 · 从史料中寻见山河',
      title: '循历史的\n线索，\n绘出山河\n的来处。',
      description: '一条疆界，一座城池，一段有据可循的历史。以地图重新认识时间留下的世界。',
      words: '山川疆域古城州郡沿革考据历史经纬河海志地理绘图记录天图府',
    },
    {
      id: 'alternate', topicId: 'ban-jiakong', roof: 'atlas/roof-vermilion-v1.png',
      kicker: '半架空 · 在熟悉的世界里岔开一条路',
      title: '如果历史\n在此转身，\n远方会是\n怎样的\n风景。',
      description: '真实的地理，另一种历史。让考据与想象相遇，描绘一条未曾走过的道路。',
      words: '历史平行城邦山河叙事海岸疆界探索想象制图经纬记忆远方天图府',
    },
    {
      id: 'imagined', topicId: 'quan-jiakong', roof: 'atlas/roof-canopy-v1.png',
      kicker: '全架空 · 为想象赋予疆域',
      title: '在未被\n命名的\n远方，\n构建一个\n新世界。',
      description: '从第一条海岸线，到文明与故事的交汇。地图是世界的开端，也是想象的容器。',
      words: '原创世界文明幻想大陆群岛远方星辰神话山海故事构建地图天图府',
    },
  ],
}

/** 页面视图标识（hash 路由） */
export type ViewName =
  | 'home'
  | 'about'
  | 'directory'
  | 'earth'
  | 'works'
  | 'contact'
  | 'member'
  | 'news'
  | 'culture'
  | 'contest'
  | 'work'
  | 'topic'
  | 'join'
  | 'commission'
  | 'faq'
  | 'legal'
  | 'news-detail'

/** 社团介绍页内容（除 stats 外均为占位文案，后续替换） */
export const aboutContent = {
  introTitle: '天图府社团简介',
  introBody:
    '这里是天图府社团简介的占位正文：一个专注于架空地图绘制与架空世界构建的创作者社团，核心业务包括架空历史地图制作、架空世界设定与地图绘制、历史地理复原研究、地图绘制过程分享，以及承接地图约稿。后续将替换为正式社团简介文案。',
  mission: '社团宗旨占位文本：以地图为笔，探索、构建、记录架空世界的无限可能。后续替换为正式宗旨文案。',
  history: '社团历史占位文本：从几位制图爱好者开始，逐步成长为专注架空地图与世界观构建的创作者社团。后续替换为正式历史文案。',
  stats: [
    { label: '作品数量', value: '120+', suffix: '幅', note: '占位数据' },
    { label: '地图覆盖区域', value: '12', suffix: '个世界', note: '占位数据' },
    { label: '成员数', value: '18', suffix: '人', note: '占位数据' },
    { label: '合作项目', value: '30+', suffix: '项', note: '占位数据' },
  ],
  annals: [
    { date: '20XX 年', title: '建社之始', desc: '社团正式成立，第一批成员加入（占位）' },
    { date: '20XX 年', title: '首张架空地图发布', desc: '完成第一张公开作品，确立制图方向（占位）' },
    { date: '20XX 年', title: '单图制图大赛启幕', desc: '第一届赛事举办，吸引首批参赛者（占位）' },
    { date: '20XX 年', title: '世界观共创计划', desc: '启动多人协作的架空世界构建项目（占位）' },
    { date: '20XX 年', title: '历史地理复原专栏', desc: '开启考据向创作方向与专栏内容（占位）' },
    { date: '20XX 年', title: '作品集公开', desc: '官网作品集上线，对外展示精选作品（占位）' },
    { date: '20XX 年', title: '约稿服务开放', desc: '面向外部承接地图绘制与设定服务（占位）' },
    { date: '20XX 年', title: '成员突破 18 人', desc: '社团规模持续扩大，创作方向多元化（占位）' },
  ],
  news: [
    { date: '20XX-XX-XX', title: '天图府官网正式上线', desc: '官网开放首页、社团介绍、作品集等栏目（占位）', tag: '公告', body: '正文占位：天图府官网正式上线，欢迎访问并了解我们。后续替换为正式公告文案。' },
    { date: '20XX-XX-XX', title: '第二届单图制图大赛报名开启', desc: '面向全网征集单张架空地图作品（占位）', tag: '活动', body: '正文占位：第二届单图制图大赛开始报名，主题与细则详见赛事页面。后续替换为正式公告。' },
    { date: '20XX-XX-XX', title: '成员新作《近东 1045》发布', desc: '笙茗Reves 带来近东题材架空历史地图（占位）', tag: '作品动态', body: '正文占位：新作《近东 1045》已在作品集收录，欢迎前往查看。后续替换为正式介绍。' },
    { date: '20XX-XX-XX', title: '约稿服务开放', desc: '承接架空地图与世界观设定绘制（占位）', tag: '公告', body: '正文占位：天图府约稿服务开放，流程与须知详见约稿页面。后续替换为正式说明。' },
    { date: '20XX-XX-XX', title: '架空世界构建圆桌分享', desc: '成员线上交流世界构建方法论（占位）', tag: '活动', body: '正文占位：圆桌分享活动即将举办，欢迎报名旁听。后续替换为正式活动文案。' },
    { date: '20XX-XX-XX', title: '主题作品合集更新', desc: '正史、半架空、全架空三类作品持续收录（占位）', tag: '作品动态', body: '正文占位：创作主题合集新增多张作品，分类索引同步更新。后续替换为正式动态。' },
    { date: '20XX-XX-XX', title: '第一届大赛获奖名单公布', desc: '获奖作品与作者名单正式公开（占位）', tag: '赛事', body: '正文占位：第一届单图制图大赛获奖名单公布，优秀作品已在赛事页展示。后续替换为正式名单。' },
    { date: '20XX-XX-XX', title: '社团招新开启', desc: '面向制图者与世界观构建者招募（占位）', tag: '公告', body: '正文占位：社团新一轮招新开启，加入方式详见“加入我们”。后续替换为正式招新文案。' },
    { date: '20XX-XX-XX', title: '历史地理复原考据讲座', desc: '分享历史地图复原的研究方法（占位）', tag: '活动', body: '正文占位：考据讲座围绕年代断代、疆域沿革展开，后续替换为正式内容。' },
    { date: '20XX-XX-XX', title: '全架空主题新作收录', desc: '原创世界作品进入主题子页（占位）', tag: '作品动态', body: '正文占位：全架空主题收录多张原创世界地图，后续替换为正式介绍。' },
    { date: '20XX-XX-XX', title: '第三届大赛作品征集', desc: '新一届赛事主题与细则公布（占位）', tag: '赛事', body: '正文占位：第三届单图制图大赛开始征集，欢迎投稿。后续替换为正式公告。' },
    { date: '20XX-XX-XX', title: '版权与转载说明更新', desc: '完善转载授权与免责声明（占位）', tag: '公告', body: '正文占位：版权与免责声明已更新，详见版权页面。后续替换为正式说明。' },
  ],
  culture: [
    { title: '以图会友', desc: '围绕地图与世界观展开交流，作品是共同语言（占位）' },
    { title: '考据与想象并重', desc: '既尊重历史地理事实，也拥抱大胆的架空想象（占位）' },
    { title: '共同创作与署名文化', desc: '多人协作项目按贡献署名，尊重每一位创作者（占位）' },
    { title: '每月制图沙龙', desc: '定期线上交流制图技法、设定方法与作品评审（占位）' },
    { title: '世界观档案馆', desc: '沉淀成员共创的设定资料，形成可复用的世界档案（占位）' },
    { title: '新人导师制', desc: '新成员由资深制图师一对一指导入门（占位）' },
  ],
}

/** 星轨目录页内容（占位，后续替换） */
export const directoryContent = {
  title: '天图府目录',
  subtitle: '制作者名单 · 重大事件',
  makers: [
    { name: '制作者一', role: '身份 / 擅长领域占位' },
    { name: '制作者二', role: '身份 / 擅长领域占位' },
  ],
  events: [
    { date: '20XX', title: '重大事件一', desc: '事件描述占位' },
    { date: '20XX', title: '重大事件二', desc: '事件描述占位' },
  ],
}

/** 代码地球页内容（占位，后续替换） */
export const earthContent = {
  title: '代码地球',
  subtitle: '在星尘之间，寻见山河。',
  // 15 个预留关键词（红色标出，交互式，后续替换正式内容）
  keywords: [
    '架空地图',
    '世界构建',
    '历史复原',
    '制图学',
    '探索',
    '记录',
    '叙事',
    '疆域',
    '山川',
    '城邦',
    '航线',
    '编年',
    '传说',
    '星图',
    '档案',
  ],
}

/** 作品集页（占位，后续替换正式作品内容） */
export const worksContent = {
  title: '作品集',
  subtitle: '精选地图 · 架空世界 · 历史复原',
  desc: '作品集页面建设中，敬请期待。后续将在此展示架空地图与世界观作品。',
}

/** 作品分类（管理员可增删；作品档案按此分类筛选） */
export const worksCategories = ['历史地图', '世界地图', '设定图', '赛事作品', '概念图']

/**
 * 全站文案字典：页面上的按钮、提示、区块小标题等固定文字集中在这里。
 * 管理员可在「内容管理 → 页面文案」中修改；修改即时保存并实时显示。
 */
export const uiText = {
  exhibition: {
    title: '一纸山河，\n无尽世界。',
    intro: '以经纬记录历史，以想象绘制远方。走近天图府制图者笔下的山河，读懂每一幅地图的世界。',
    featuredTitle: '展中的山河',
    circularGallery: {
      region: '环形地图展架', previous: '上一幅展图', next: '下一幅展图', pause: '暂停旋转', play: '继续旋转', read: '展开地图',
      hint: '拖动展图或用左右箭头翻阅，点击展开全图。手机端可横向滑动。',
    },
    themesTitle: '三种目光，绘向世界',
    authorsTitle: '地图背后的制图者',
    authorPage: '走进作者主页',
    explore: '探索全部地图',
    readMap: '阅读这幅地图',
    manifesto: '以图会友，以笔绘世界。',
    watchIntro: '观看社团序章',
    exploreTitle: '展开一幅地图，\n走进一个世界。',
    exploreIntro: '选取作品，放大疆域与地名。地图保留完整比例，让每一处绘制细节都能够被阅读。',
    previousMap: '上一幅地图',
    nextMap: '下一幅地图',
    selectMap: '选择馆藏地图',
    railHint: '点击缩略图选择地图 · 方向键切换',
    empty: '这里正在等待新的地图作品。',
    catalogueTitle: '山河入藏，\n故事待展。',
    catalogueIntro: '从一幅地图读起，沿着作者的视角走近历史与想象。每一幅馆藏，都可以展开细读。',
    collectionTitle: '翻阅全部馆藏',
    browseCatalogue: '浏览全部作品',
    authorArchive: '制图者档案',
    resetFilters: '清除筛选',
    shownLabel: '已展示',
    countUnit: '幅',
    memberCollection: '这位作者的地图',
    memberCollectionHint: '悬停展开一幅作品，点击进入细读。',
    badgeWindow: {
      label: '穿过徽章，阅读一段旧世界',
      eyebrow: 'ARCHIVE WINDOW · TIANTUFU',
      footer: '地图不是背景，是入口。',
      scrollHint: 'SCROLL / KEEP READING',
      coordinate: 'E 104° · N 35°',
      pause: '暂停地图漂移',
      resume: '继续地图漂移',
    },
    memberStory: '制图者的话',
    memberDomains: '创作领域',
    memberIdentity: '社团身份',
    memberContactName: 'QQ昵称',
    memberJoined: '加入年份',
    memberCooperation: '合作与约稿',
    memberPublicLink: '作者的个人空间',
    workCreated: '绘制年份',
    workSetting: '年代与世界背景',
    workRights: '署名与转载',
    workStory: '阅读这幅地图',
    memberUnavailable: '此作者主页尚未公开或暂不可访问。',
    noMemberWorks: '作者正在整理新的作品。',
    viewStory: '阅读札记',
    hideStory: '收起札记',
    themeIntro: '同一张纸，三种观看世界的方式。循史料、改写历史，或从想象中建立新的山河。',
    enterGallery: '进入展厅',
    themeUnavailable: '此创作主题暂不可访问，请返回主题索引。',
    aboutNotice: '说明文案、年鉴与统计数据仍待社团确认。',
    contactIntro: '从一次交流开始，让地图与故事有新的去处。',
    contactChannels: '保持联系',
    copyContact: '复制',
    contactCopied: '已复制',
    copyFailed: '复制未成功，请手动选取文字。',
    contactPending: '待确认',
  },
  home: {
    nameEn: 'TiantuMansion',
    primaryCta: '翻阅地图馆藏',
    aboutLabel: '关于天图府',
    secondaryCta: '加入我们',
    previewTitle: '精选作品',
    newsTitle: '最新动态',
    viewWorks: '查看全部作品 →',
    viewNews: '查看全部 →',
    worksShort: '作品 →',
    latestNewsFallback: '最新动态（占位）',
    atlasTitle: '一纸山河，\n无尽世界。',
    atlasCaption: '以经纬记录历史，以想象绘制远方。',
    atlasNote: '历史的边界之外，还有未被绘出的世界。',
    atlasAria: '选择地图主题预览',
  },
  nav: {
    searchAria: '站内搜索（Ctrl+K 或 /）',
    loginAria: '登录或注册账号',
    loginTitle: '登录 / 注册成员账号',
    loggedInPrefix: '已登录：',
    homeSuffix: '首页',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
  },
  about: {
    kicker: '社团介绍',
    missionLabel: '社团宗旨',
    historyLabel: '社团历史',
    annalsLabel: '年鉴 · 重大事件',
    newsCta: '新闻动态 →',
    cultureCta: '社团文化 →',
    contestCta: '单图制图大赛 →',
  },
  directory: {
    kicker: 'E 120° · 03 · TOPICS',
    title: '创作主题',
    subtitle: '正史地图 · 半架空 · 全架空',
    enterSuffix: '位作者 · 进入 →',
  },
  earth: {
    indexTitle: '关键词索引',
    intro:
        '从天图府的罗盘出发，看颗粒聚拢成制图者笔下的山海。选一幅地图，让散落的星尘重新找到自己的疆域。',
    clickHint: '点击地球 · 随机发现一位作者的作品',
      compassLabel: '天图府罗盘',
      particleHint: '移动指针拨开星尘 · 触屏可轻划',
      readMap: '展开这幅地图',
      discoverLabel: '随机探访一位制图者',
  },
  works: {
    kicker: 'E 120° · 05 · WORKS · 作品集',
    openHint: '从一幅全图出发，放大疆域、地名与绘制细节。点击地图开始阅读，也可以沿作者的手记继续探索。',
    readMap: '阅读地图',
    authorPage: '制图者手记',
    advancedFilters: '更多筛选',
    catalogue: '馆藏编目',
    readingNote: '阅读说明',
    archiveTitle: '作品档案',
    archiveKicker: 'E 120° · 05A · WORKS ARCHIVE · 作品档案',
    archiveNote: '按创作主题与作品分类归档的全站作品库',
    filterAll: '全部',
    allTopics: '全部主题',
    allTypes: '全部类型',
    authorLabel: '作者',
    expand: '展开更多作品 ↓',
    collapse: '收起 ↑',
    empty: '该筛选条件下暂无作品（占位提示）',
    emptyMembers: '该主题暂无成员作品（占位提示）',
    allMembers: '全部作者',
    collagePause: '暂停背景',
    collagePlay: '播放背景',
  },
  contact: {
    kicker: 'CONTACT · 联系天图府',
    title: '联系天图府',
    qqLabel: 'QQ',
    biliLabel: 'BILIBILI',
    emailLabel: 'EMAIL',
    groupLabel: 'QQ GROUP',
    qqNote: '占位号码 · 待替换',
    biliNote: '占位链接 · 待替换',
    emailNote: '占位邮箱 · 待确认',
    groupNote: 'QQ 群号 · 待替换',
    joinCard: '加入我们',
    joinCardDesc: '成为天图府的一员',
    commissionCard: '约稿服务',
    commissionCardDesc: '承接架空地图与设定绘制',
    faqCard: '常见问题',
    faqCardDesc: '加入 / 约稿 / 版权',
    legalCard: '版权声明',
    legalCardDesc: '授权与免责说明',
    accountLogin: '登录 / 注册',
    accountLoginHint: '登录 / 注册成员账号（快捷键 Ctrl+Shift+A）',
    keyboardHint: '快捷键：1-6 切换页面 · Ctrl+K 搜索 · B 返回 · ? 查看',
    copyrightPrefix: '©',
    copyrightSuffix: '· tiantufu.com',
  },
  news: {
    kicker: 'E 120° · 08 · NEWS · 社团新闻',
    title: '新闻动态',
    subtitle: '近期社团动态与公告（占位内容，后续替换）',
    contestCta: '天图府·单图制图大赛 →',
    backAbout: '← 返回社团介绍',
    empty: '该分类暂无新闻（占位提示）',
    expand: '展开更多动态 ↓',
    detailHint: '详情 →',
    allFilter: '全部',
    filterLabel: '筛选新闻分类',
  },
  culture: {
    title: '社团文化',
    subtitle: '文化理念与活动（占位内容，后续替换）',
    backAbout: '← 返回社团介绍',
    kicker: 'E 120° · 09 · CULTURE · 社团文化',
  },
  member: {
    kicker: 'E 120° · 07 · MEMBER · 成员个人页',
    backWorks: '← 返回作品集',
    representative: 'REPRESENTATIVE WORK · 代表作',
    extensionPrefix: '延伸',
    featured: '代表作',
    zoomHint: '点击放大',
    zoomAriaPrefix: '放大查看《',
    zoomAriaSuffix: '》',
  },
  work: {
    kicker: 'E 120° · 11 · RANDOM DISCOVERY · 随机发现',
    backEarth: '← 返回数码地球',
    sectionKicker: 'WORK · 随机作品',
    zoomAriaPrefix: '放大查看《',
    zoomAriaSuffix: '》',
  },
  keywordSpotlight: {
    imageLabel: '占位图',
    body: '此处为占位内容，后续替换为与该关键词相关的图片或文字。',
  },
  lightbox: {
    dialogLabel: '图片放大查看',
    close: '关闭',
    previous: '上一张',
    next: '下一张',
    zoomIn: '放大地图',
    zoomOut: '缩小地图',
    reset: '查看全图',
    guide: '滚轮 / 双指缩放 · 拖动阅读 · 双击放大',
    storyTitle: '地图阅读札记',
    pendingStory: '作者尚未补充阅读札记。先从全图的图例、地名与边界开始阅读。',
    overview: '全图定位',
    loading: '正在展开地图…',
    loadError: '地图未能加载，请返回后重试。',
  },
  commission: {
    kicker: 'COMMISSION · 约稿服务',
    backContact: '← 返回联系',
    priceTitle: '价格参考',
    qqConsult: 'QQ 咨询',
    emailConsult: '邮件咨询',
  },
  contest: {
    kicker: 'E 120° · 10 · CONTEST · 赛事活动',
    back: '← 返回',
    editionsTitle: '往届数据',
    participantsLabel: '参赛',
    awardsLabel: '获奖',
    winnersTitle: '获奖者名单',
    worksTitle: '往届优秀作品（占位 · 后续可调整为瀑布流/轮播）',
    rulesTitle: '比赛细则',
    videoTitle: 'B 站宣传视频',
    draftNotice: '档案编纂中：以下届次、人数、奖项与作品配图均为示意，待社团核实后正式发布。',
    allEditions: '全部届次',
    filterLabel: '选择赛事届次',
    noWorks: '该届作品尚未整理，敬请期待。',
    videoPending: '宣传视频待发布',
    sampleWork: '示意配图 · 非获奖认证',
  },
  join: {
    kicker: 'E 120° · 13 · JOIN · 加入我们',
    backContact: '← 返回联系',
    register: '注册成员账号',
    joinGroup: '加入 QQ 群',
    reviewNote: '注册后由管理员审核，通过后自动生成你的个人主页与作品集。',
  },
  legal: {
    kicker: 'E 120° · 16 · LEGAL · 声明',
    backContact: '← 返回联系',
  },
  faq: {
    kicker: 'E 120° · 15 · FAQ · 常见问题',
    backContact: '← 返回联系',
  },
  topic: {
    kicker: 'E 120° · 12 · TOPIC · 创作主题',
    backDirectory: '← 返回创作主题',
    worksAuthors: '作品与作者',
    enterAuthor: '进入 →',
    empty: '该主题暂无作品（占位，后续补充）',
  },
  newsDetail: {
    kicker: 'E 120° · 17 · NEWS · 新闻详情',
    fallbackTitle: '新闻详情（占位）',
    backNews: '← 返回新闻',
    emptyBody: '新闻正文占位：请从新闻列表选择一条新闻查看详情。',
    relatedLabel: '继续阅读新闻',
    previous: '上一篇',
    next: '下一篇',
  },
  search: {
    label: '站内搜索',
    placeholder: '搜索新闻、成员、作品、主题、FAQ…',
    keywordLabel: '搜索关键词',
    quickLinks: '快捷入口',
    quickWorks: '作品集',
    quickNews: '新闻动态',
    quickFaq: '常见问题',
    quickCommission: '约稿服务',
    shortcutHint: 'Ctrl K / ESC',
    typeLabels: {
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
    },
    empty: '未找到相关内容（占位提示）',
    supports: '支持搜索：新闻 · 成员 · 作品 · 创作主题 · FAQ · 赛事 · 约稿 · 版权',
    keyboardHint: '↑↓ 选择 · Enter 跳转 · Esc 关闭',
  },
  keywordDock: {
    title: '关键词目录',
    heading: '关键词目录',
    hoverHint: '悬停查看 · 占位内容',
    replaceHint: '后续替换为正式说明',
    collapse: '收起关键词目录',
    expand: '展开关键词目录',
    verticalLabel: '目录',
  },
}

/** 作品档案条目：全站作品库，支持主题与分类双维度归档 */
export interface WorkDetails {
  /** 实际绘制年份，与地图描绘的年代分开。 */
  createdYear?: string
  setting?: string
  rights?: string
}

export interface WorkItem extends WorkDetails {
  id: string
  title: string
  author: string
  /** Stable member identity; display names are not unique keys. */
  authorMemberId?: string
  image: string
  fullImage?: string
  desc: string
  /** 创作主题 id（对应 topics） */
  topic: string
  /** 作品分类（对应 worksCategories） */
  category: string
  year?: string
  published?: boolean
  /** 作者提供的阅读札记，保持空白直至得到真实说明。 */
  story?: string
}

/** 作品档案默认内容（占位；成员页另有个人作品集，管理员可独立维护） */
export const works: WorkItem[] = [
  { id: 'w-shengming-1', title: '近东 1045', author: '笙茗Reves', image: workShengming, desc: '公元 1045 年前后近东地区的架空历史地图（占位）。', topic: 'zhengshi', category: '历史地图', year: '1045' },
  { id: 'w-shengming-2', title: '占位延伸·近东航线', author: '笙茗Reves', image: workShengming, desc: '近东航线专题图（占位）。', topic: 'zhengshi', category: '设定图' },
  { id: 'w-shengxiong-1', title: '烈焰升腾：美利坚', author: '圣雄肝帝', image: workShengxiong, desc: '单图制图大赛作品《烈焰升腾：美利坚》（占位）。', topic: 'ban-jiakong', category: '赛事作品', year: '20XX' },
  { id: 'w-shengxiong-2', title: '占位延伸·大陆纪行', author: '圣雄肝帝', image: workShengxiong, desc: '大陆纪行系列世界地图（占位）。', topic: 'ban-jiakong', category: '世界地图' },
  { id: 'w-baicai-1', title: '南唐', author: '子虚的白菜', image: workBaicai, desc: '架空历史地图《南唐》（占位）。', topic: 'quan-jiakong', category: '历史地图' },
  { id: 'w-baicai-2', title: '占位延伸·南唐风物', author: '子虚的白菜', image: workBaicai, desc: '南唐风物概念图（占位）。', topic: 'quan-jiakong', category: '概念图' },
  { id: 'w-weilai-1', title: '占位作品·星海航路', author: '制图者·甲', image: workShengxiong, desc: '半架空题材航路专题图（占位）。', topic: 'ban-jiakong', category: '世界地图' },
  { id: 'w-weilai-2', title: '占位作品·潮汐湾', author: '制图者·甲', image: workShengxiong, desc: '潮汐湾区域设定图（占位）。', topic: 'ban-jiakong', category: '设定图' },
  { id: 'w-changhe-1', title: '占位作品·旧都舆图', author: '制图者·乙', image: workShengming, desc: '历史地理复原方向的旧都舆图（占位）。', topic: 'zhengshi', category: '历史地图' },
  { id: 'w-changhe-2', title: '占位作品·驿路考', author: '制图者·乙', image: workShengming, desc: '驿路复原概念图（占位）。', topic: 'zhengshi', category: '概念图' },
  { id: 'w-xingtu-1', title: '占位作品·九霄疆域', author: '制图者·丙', image: workBaicai, desc: '完全架空世界的疆域总图（占位）。', topic: 'quan-jiakong', category: '世界地图' },
  { id: 'w-xingtu-2', title: '占位作品·四域诸国', author: '制图者·丙', image: workBaicai, desc: '四域诸国分图设定（占位）。', topic: 'quan-jiakong', category: '设定图' },
  { id: 'w-gebi-yinhe-1', title: '北方十字军1227（重置中）', author: '隔壁老银河', authorMemberId: 'gebi-lao-yinhe', image: avatarGebiYinhe, desc: '代表作《北方十字军1227》（重置中）。作品图待上传，当前使用成员头像作为临时封面。', topic: 'zhengshi', category: '历史地图', year: '1227', published: true },
  { id: 'w-helietis-1', title: '北方七省地形图', author: '赫列提斯', authorMemberId: 'helietis', image: avatarHelietis, desc: '代表作《北方七省地形图》。作品图待上传，当前使用成员头像作为临时封面。', topic: 'quan-jiakong', category: '地形地图', published: true },
  { id: 'w-topiatsiak-1', title: '代表作一（待命名）', author: 'Topiatsiak', authorMemberId: 'topiatsiak', image: workTopiatsiak1, desc: 'Topiatsiak 代表作，标题与创作说明待补充。', topic: 'zhengshi', category: '历史地图', published: true },
  { id: 'w-topiatsiak-2', title: '代表作二（待命名）', author: 'Topiatsiak', authorMemberId: 'topiatsiak', image: workTopiatsiak2, desc: 'Topiatsiak 代表作，标题与创作说明待补充。', topic: 'zhengshi', category: '历史地图', published: true },
  { id: 'w-topiatsiak-3', title: '代表作三（待命名）', author: 'Topiatsiak', authorMemberId: 'topiatsiak', image: workTopiatsiak3, desc: 'Topiatsiak 代表作，标题与创作说明待补充。', topic: 'zhengshi', category: '历史地图', published: true },
]

/** 管理员模式配置（前端演示用密码，非真实安全认证；正式部署请改为服务端鉴权） */
export const adminConfig = {
  username: 'admin', // 默认管理员用户名（首次登录后建议在“修改登录信息”中修改）
  passcode: 'tiantufu-admin', // 默认初始密码（首次登录后建议修改）
}

/** 成员代表作：一人一张代表作，点击卡片进入成员个人页（占位文案后续替换） */
export interface MemberWork extends WorkDetails {
  title: string
  image: string
  fullImage?: string
  desc: string
  story?: string
  topic?: string
  category?: string
}

export interface Member {
  id: string
  published?: boolean
  name: string
  role: string
  /** 创作主题分类：topics 中的 id */
  topic: string
  /** 多选创作领域；旧内容未提供时使用 topic。不决定作品分类。 */
  domains?: string[]
  societyRole?: string
  /** 对外展示的 QQ / 社区昵称（不展示登录邮箱） */
  contactName?: string
  joinedYear?: string
  signature?: string
  cooperation?: string
  publicUrl?: string
  avatar: string
  bio: string
  /** 擅长领域标签（占位，管理员可编辑） */
  tags?: string[]
  work: MemberWork
  /** 更多作品（占位；成员页用于切换大图预览） */
  works?: MemberWork[]
}

export const members: Member[] = [
  {
    id: 'shengming-reves',
    name: '笙茗Reves',
    role: '制图师 · 架空历史地图',
    topic: 'zhengshi',
    avatar: avatarShengming,
    bio: '成员个人简介占位文本：这里是笙茗Reves的个人介绍，后续替换为正式文案。',
    tags: ['架空历史', '近东', '考据'],
    work: {
      title: '近东 1045',
      image: workShengming,
      fullImage: 'collection/near-east-1045.webp',
      desc: '代表作说明占位文本：公元 1045 年前后近东地区的架空历史地图。后续替换为正式作品介绍。',
    },
    works: [
      { title: '占位延伸·近东航线', image: workShengming, desc: '更多作品说明占位：近东航线专题图。' },
      { title: '占位延伸·近东城邦', image: workShengming, desc: '更多作品说明占位：近东城邦格局图。' },
    ],
  },
  {
    id: 'shengxiong-gandi',
    name: '圣雄肝帝',
    role: '制图师 · 架空历史地图',
    topic: 'ban-jiakong',
    avatar: avatarShengxiong,
    bio: '成员个人简介占位文本：这里是圣雄肝帝的个人介绍，后续替换为正式文案。',
    tags: ['半架空', '近现代', '叙事'],
    work: {
      title: '烈焰升腾：美利坚',
      image: workShengxiong,
      fullImage: 'collection/america.webp',
      desc: '代表作说明占位文本：单图制图大赛作品《烈焰升腾：美利坚》。后续替换为正式作品介绍。',
    },
    works: [
      { title: '占位延伸·大陆纪行', image: workShengxiong, desc: '更多作品说明占位：大陆纪行系列。' },
      { title: '占位延伸·星火燎原', image: workShengxiong, desc: '更多作品说明占位：星火燎原专题图。' },
    ],
  },
  {
    id: 'zixu-debaicai',
    name: '子虚的白菜',
    role: '制图师 · 架空历史地图',
    topic: 'quan-jiakong',
    avatar: avatarBaicai,
    bio: '成员个人简介占位文本：这里是子虚的白菜的个人介绍，后续替换为正式文案。',
    tags: ['全架空', '南唐', '水墨'],
    work: {
      title: '南唐',
      image: workBaicai,
      fullImage: 'collection/nantang.webp',
      desc: '代表作说明占位文本：架空历史地图《南唐》。后续替换为正式作品介绍。',
    },
    works: [
      { title: '占位延伸·南唐风物', image: workBaicai, desc: '更多作品说明占位：南唐风物专题图。' },
      { title: '占位延伸·九霄疆域', image: workBaicai, desc: '更多作品说明占位：九霄疆域设定图。' },
    ],
  },
  {
    id: 'gebi-lao-yinhe',
    published: true,
    name: '隔壁老银河',
    role: '管理员 · 北方十字军史 / 古罗斯史',
    topic: 'zhengshi',
    domains: ['zhengshi', 'ban-jiakong', 'quan-jiakong'],
    societyRole: '管理员',
    joinedYear: '2020年 · 与天图府同日创立',
    signature: '新世代嬉皮士战士',
    publicUrl: 'https://search.bilibili.com/all?keyword=%E9%9A%94%E5%A3%81%E8%80%81%E9%93%B6%E6%B2%B3',
    avatar: avatarGebiYinhe,
    bio: '兴趣方向为北方十字军史与古罗斯史，偶尔也做点架空。擅长东北欧历史、架空瞎想，以及在史料与想象之间寻找新的地图叙事。',
    tags: ['东北欧', '北方十字军史', '古罗斯史', '架空瞎想'],
    work: {
      title: '北方十字军1227（重置中）',
      image: avatarGebiYinhe,
      desc: '代表作《北方十字军1227》（重置中）。作品图待上传，当前使用成员头像作为临时封面。',
      topic: 'zhengshi',
      category: '历史地图',
    },
    works: [
      {
        title: '丧尸危机：生还无望',
        image: avatarGebiYinhe,
        desc: '代表作《丧尸危机：生还无望》。作品图待上传，当前使用成员头像作为临时封面。',
        topic: 'ban-jiakong',
        category: '世界设定',
      },
    ],
  },
  {
    id: 'helietis',
    published: true,
    name: '赫列提斯',
    role: '制图师 · 全架空地理与历史构建',
    topic: 'quan-jiakong',
    domains: ['quan-jiakong'],
    societyRole: '成员',
    contactName: '托马斯维德',
    joinedYear: '2025年6月',
    signature: '以地理之广承载历史之重',
    publicUrl: 'https://search.bilibili.com/all?keyword=%E8%B5%AB%E5%88%97%E6%8F%90',
    avatar: avatarHelietis,
    bio: '为了写小说误入地图圈，主攻架空世界构建，擅长制作仿真架空地形，并尝试多样性的风格化地图。主力工具为 Photoshop、QGIS 与 Gaea 2。B 站与小红书同名：赫列提斯。',
    tags: ['全架空', '仿真地形', '世界构建', 'Photoshop', 'QGIS', 'Gaea 2'],
    work: {
      title: '北方七省地形图',
      image: avatarHelietis,
      desc: '代表作《北方七省地形图》。作品图待上传，当前使用成员头像作为临时封面。',
      topic: 'quan-jiakong',
      category: '地形地图',
    },
    works: [
      {
        title: '班塔1777',
        image: avatarHelietis,
        desc: '代表作《班塔1777》。作品图待上传，当前使用成员头像作为临时封面。',
        topic: 'quan-jiakong',
        category: '历史地图',
      },
      {
        title: '暮光灿然',
        image: avatarHelietis,
        desc: '代表作《暮光灿然》。作品图待上传，当前使用成员头像作为临时封面。',
        topic: 'quan-jiakong',
        category: '风格化地图',
      },
    ],
  },
  {
    id: 'topiatsiak',
    published: true,
    name: 'Topiatsiak',
    role: '管理员 · 东南亚与太平洋地图',
    topic: 'zhengshi',
    domains: ['zhengshi'],
    societyRole: '管理员',
    joinedYear: '2022年7月',
    signature: '致力于传播和发展制图新质生产力',
    publicUrl: 'https://search.bilibili.com/all?keyword=Topiatsiak',
    avatar: avatarTopiatsiak,
    bio: '本职专业是地理科学学生，主要制作方向为广义东南亚以及太平洋地区。认为画图等于一种养生方法。',
    tags: ['东南亚', '太平洋', '地理科学理论', '正史', '睡觉（不是）'],
    work: {
      title: '代表作一（待命名）',
      image: workTopiatsiak1,
      desc: 'Topiatsiak 的代表作，标题与创作说明待补充。',
      topic: 'zhengshi',
      category: '历史地图',
    },
    works: [
      {
        title: '代表作二（待命名）',
        image: workTopiatsiak2,
        desc: 'Topiatsiak 的代表作，标题与创作说明待补充。',
        topic: 'zhengshi',
        category: '历史地图',
      },
      {
        title: '代表作三（待命名）',
        image: workTopiatsiak3,
        desc: 'Topiatsiak 的代表作，标题与创作说明待补充。',
        topic: 'zhengshi',
        category: '历史地图',
      },
    ],
  },
  {
    id: 'weilai-zhitu',
    name: '制图者·甲',
    role: '制图师 · 半架空 / 世界构建（占位）',
    topic: 'ban-jiakong',
    avatar: avatarShengxiong,
    bio: '成员个人简介占位文本：这里是占位成员“制图者·甲”的个人介绍，后续替换为正式文案。',
    tags: ['航路', '城邦', '世界构建'],
    work: {
      title: '占位作品·星海航路',
      image: workShengxiong,
      desc: '代表作说明占位文本：半架空题材的航路专题图，后续替换为正式作品介绍。',
    },
    works: [
      { title: '占位作品·潮汐湾', image: workShengxiong, desc: '更多作品说明占位：潮汐湾区域图。' },
      { title: '占位作品·渡口之城', image: workShengxiong, desc: '更多作品说明占位：渡口之城设定图。' },
    ],
  },
  {
    id: 'changhe-lingtu',
    name: '制图者·乙',
    role: '制图师 · 正史 / 复原（占位）',
    topic: 'zhengshi',
    avatar: avatarShengming,
    bio: '成员个人简介占位文本：这里是占位成员“制图者·乙”的个人介绍，后续替换为正式文案。',
    tags: ['复原', '疆域沿革', '考据'],
    work: {
      title: '占位作品·旧都舆图',
      image: workShengming,
      desc: '代表作说明占位文本：历史地理复原方向的旧都舆图，后续替换为正式作品介绍。',
    },
    works: [
      { title: '占位作品·驿路考', image: workShengming, desc: '更多作品说明占位：驿路复原图。' },
      { title: '占位作品·郡县沿革', image: workShengming, desc: '更多作品说明占位：郡县沿革示意图。' },
    ],
  },
  {
    id: 'xingtu-yuanyu',
    name: '制图者·丙',
    role: '制图师 · 全架空（占位）',
    topic: 'quan-jiakong',
    avatar: avatarBaicai,
    bio: '成员个人简介占位文本：这里是占位成员“制图者·丙”的个人介绍，后续替换为正式文案。',
    tags: ['原创世界', '神系', '种族'],
    work: {
      title: '占位作品·九霄疆域',
      image: workBaicai,
      desc: '代表作说明占位文本：完全架空世界的疆域总图，后续替换为正式作品介绍。',
    },
    works: [
      { title: '占位作品·四域诸国', image: workBaicai, desc: '更多作品说明占位：四域诸国分图。' },
      { title: '占位作品·星陨之渊', image: workBaicai, desc: '更多作品说明占位：星陨之渊设定图。' },
    ],
  },
]

/** 单图制图大赛页内容（占位，后续替换正式文案） */
export const contestContent = {
  title: '天图府·单图制图大赛',
  subtitle: '以一张地图，讲述一个世界',
  videoUrl: 'https://b23.tv/xxxxxx', // TODO: 替换为 B 站宣传视频链接
  editions: [
    { edition: '第一届', year: '20XX 年', participants: '32 人', awards: '9 件' },
    { edition: '第二届', year: '20XX 年', participants: '56 人', awards: '12 件' },
    { edition: '第三届', year: '20XX 年', participants: '80 人', awards: '15 件' },
  ],
  winners: [
    { edition: '第一届', names: ['获奖者一', '获奖者二', '获奖者三', '优秀奖：制图者·甲'] },
    { edition: '第二届', names: ['获奖者一', '获奖者二', '获奖者三', '优秀奖：制图者·乙'] },
    { edition: '第三届', names: ['获奖者一', '获奖者二', '获奖者三', '优秀奖：制图者·丙'] },
  ],
  rules:
    '参赛规则（占位）：\n1. 参赛作品须为单张架空地图，主题不限，尺寸与格式以赛事公告为准；\n2. 每人限投一张作品，须为本人原创并附创作说明；\n3. 作品一经投稿即视为授权社团在赛事页面进行展示。\n\n评分标准（占位）：\n1. 创意与世界观（40%）；\n2. 制图技法与完成度（30%）；\n3. 考据与细节（20%）；\n4. 说明文案（10%）。\n\n提交格式（占位）：高清图片 + 200 字以内的创作说明，通过赛事指定渠道提交。',
  /** 往届优秀作品（占位：独立于成员代表作，后续替换为正式赛事作品） */
  works: [
    { edition: '第一届', title: '占位作品·晨昏之城', author: '获奖者一', image: workShengming, desc: '第一届优秀作品占位说明：晨昏之城的架空历史地图。' },
    { edition: '第一届', title: '占位作品·山海之间', author: '获奖者二', image: workShengxiong, desc: '第一届优秀作品占位说明：山海之间的半架空地图。' },
    { edition: '第二届', title: '占位作品·新大陆纪行', author: '获奖者三', image: workBaicai, desc: '第二届优秀作品占位说明：新大陆纪行的全架空地图。' },
    { edition: '第二届', title: '占位作品·星火燎原', author: '获奖者一', image: workShengming, desc: '第二届优秀作品占位说明：星火燎原专题地图。' },
    { edition: '第三届', title: '占位作品·极光航道', author: '获奖者二', image: workShengxiong, desc: '第三届优秀作品占位说明：极光航道架空地图。' },
    { edition: '第三届', title: '占位作品·九重天阙', author: '获奖者三', image: workBaicai, desc: '第三届优秀作品占位说明：九重天阙设定图。' },
  ],
}

/** 创作主题：三大类（占位说明，后续替换） */
export interface Topic {
  id: string
  name: string
  desc: string
  /** 主题关键词标签（占位，管理员可编辑） */
  keywords?: string[]
}

export const topics: Topic[] = [
  { id: 'zhengshi', name: '正史地图', desc: '以严谨考据为基础的历史地图创作（占位说明，后续替换）', keywords: ['考据', '年代断代', '行政区划', '疆域沿革'] },
  { id: 'ban-jiakong', name: '半架空', desc: '基于真实地理与历史的再创作（占位说明，后续替换）', keywords: ['真实地理', '再创作', '平行历史', '城邦'] },
  { id: 'quan-jiakong', name: '全架空', desc: '完全虚构世界的整体构建（占位说明，后续替换）', keywords: ['原创世界', '世界观设定', '种族', '神系'] },
]

/** 开场序章文案（占位，后续替换） */
export const introContent = {
  welcomeTitle: '天图府',
  welcomeTitleEn: 'TIANTUFU MANSION',
  welcomeSlogan: '以经纬记录历史，以想象绘制远方。',
  welcomeSloganEn: 'MAP THE PAST · IMAGINE THE ELSEWHERE',
  startLabel: '开始体验',
  startLabelEn: 'ENTER THE ARCHIVE',
  skipLabel: '跳过',
  skipLabelEn: 'SKIP INTRO',
  continueLabel: '继续',
  enterLabel: '了解我们',
  enterHomeLabel: '进入首页',
  enterHomeLabelEn: 'ENTER HOME',
  scenes: [
    { title: '一府之图', titleEn: 'A HOUSE OF MAPS', text: '天图府是一个以地图为媒介的创作者社团：我们绘制正史、半架空与全架空的疆域，也记录世界观在纸面上生长的轨迹。', textEn: 'Tiantufu is a makers’ house for maps, alternate histories and imagined worlds — a place where every border has a story.' },
    { title: '以图会友', titleEn: 'DRAW TOGETHER', text: '我们尊重考据，也珍视想象；在交流、互评与共创中，让地理成为理解历史、分享故事和连接彼此的共同语言。', textEn: 'We bring research and imagination together, using critique and collaboration to make geography a shared language.' },
    { title: '从一张草图开始', titleEn: 'FROM A SINGLE LINE', text: '社团由制图爱好者共同发起，逐步发展为开放的地图与世界构建档案。每一次落笔，都是对一片尚未命名的远方的回应。', textEn: 'Born from a few sketches, our archive grows through every line drawn toward a place not yet named.' },
    { title: '向远方展开', titleEn: 'TOWARD ELSEWHERE', text: '我们持续开放作品集、赛事与共创计划，期待与你一起把山河、文明与故事，绘成可以被阅读的世界。', textEn: 'Through exhibitions, contests and shared worlds, we invite you to draw a larger, more readable horizon with us.' },
  ],
}

/** 加入我们页内容（占位，后续替换正式文案） */
export const joinContent = {
  title: '加入我们',
  subtitle: '天图府持续招募制图者与世界观构建者',
  intro:
    '加入我们占位说明：无论你是地图制图师、历史爱好者还是世界构建者，欢迎了解天图府，一起绘制值得探索的世界。后续替换为正式招新文案。',
  requirementsTitle: '入社条件',
  requirements: [
    '对架空地图 / 架空世界构建有浓厚兴趣（占位）',
    '具备基本的制图或设定能力，愿意参与共创（占位）',
    '遵守社团章程与创作规范（占位）',
    '能参与每月至少一次的线上交流（占位）',
    '提交 1-2 张个人作品或设定稿（占位）',
    '认同“考据与想象并重”的创作理念（占位）',
  ],
  processTitle: '申请流程',
  process: [
    { step: '第一步', desc: '加入 QQ 群，填写入社问卷（占位）' },
    { step: '第二步', desc: '提交 1-2 张作品或设定稿（占位）' },
    { step: '第三步', desc: '通过审核后正式入社（占位）' },
  ],
  contactNote: '申请入口占位：QQ 群号待社团提供后替换。',
}

/** 约稿服务页内容（占位，后续替换正式文案） */
export const commissionContent = {
  title: '约稿服务',
  subtitle: '承接架空历史地图与世界观设定绘制',
  intro:
    '约稿服务占位说明：面向个人创作者、社团与工作室，承接架空地图绘制与世界设定。后续替换为正式约稿说明。',
  stepsTitle: '约稿流程',
  steps: [
    { step: '01', title: '需求沟通', desc: '确定地图类型、范围与风格（占位）' },
    { step: '02', title: '报价与排期', desc: '确认工期与价格，支付定金（占位）' },
    { step: '03', title: '绘制与反馈', desc: '初稿、修改与定稿（占位）' },
    { step: '04', title: '交付与授权', desc: '交付高清图与授权说明（占位）' },
  ],
  notesTitle: '委托须知',
  notes: '委托须知占位：\n1. 作品版权归委托方所有，社团保留署名与展示权；\n2. 包含 2 轮免费修改，超出部分按次计费；\n3. 工期自定金确认后起算，延期将提前沟通；\n4. 具体条款以正式合同为准，后续替换为正式内容。',
  priceNote: '价格参考占位：以下档位为区间示意，具体以地图范围、精细度与工期报价为准。',
  /** 价格参考四档（占位，管理员可编辑） */
  priceTable: [
    { tier: '探索档', scope: '单张区域地图 / 简要设定（占位）', price: '¥ 占位', leadTime: '占位工期' },
    { tier: '进阶档', scope: '大陆级地图 / 世界观大纲（占位）', price: '¥ 占位', leadTime: '占位工期' },
    { tier: '定制档', scope: '完整世界地图 / 多图联动（占位）', price: '¥ 占位', leadTime: '占位工期' },
    { tier: '合作档', scope: '长期项目 / 社团联合共创（占位）', price: '面议', leadTime: '按项目排期' },
  ],
}

/** 常见问题页内容（占位，后续替换正式问答） */
export const faqContent = {
  title: '常见问题',
  subtitle: '关于加入、约稿、版权与联系',
  items: [
    { category: '加入', q: '如何加入天图府？', a: '加入方式占位：加入 QQ 群并填写入社问卷（占位）' },
    { category: '加入', q: '没有制图经验可以加入吗？', a: '欢迎有热情的爱好者，具体以审核为准（占位）' },
    { category: '约稿', q: '如何联系约稿？', a: '通过 QQ / 邮箱联系并说明需求（占位）' },
    { category: '约稿', q: '约稿价格如何计算？', a: '根据地图范围与精细度报价（占位）' },
    { category: '版权', q: '作品可以转载吗？', a: '转载需注明出处，商用需另行授权（占位）' },
    { category: '版权', q: '约稿作品授权范围是什么？', a: '通常包含个人展示与商业使用权，具体以合同为准（占位）' },
    { category: '联系', q: '还有其他联系方式吗？', a: 'B站 / 邮箱 / QQ 群（占位）' },
    { category: '联系', q: '官网资料会定期更新吗？', a: '作品集、新闻与赛事信息会持续更新（占位）' },
    { category: '赛事', q: '单图制图大赛如何报名？', a: '按赛事公告提交作品与创作说明（占位）' },
    { category: '赛事', q: '往届作品在哪里查看？', a: '赛事页“往届优秀作品”区域可查看（占位）' },
  ],
}

/** 版权与免责声明页内容（占位，后续替换正式文本） */
export const legalContent = {
  title: '版权与免责声明',
  subtitle: '创作授权与使用说明',
  sections: [
    { title: '作品版权', body: '版权声明占位：社团成员作品版权归作者所有，未经许可不得商用。' },
    { title: '转载与二创', body: '转载授权占位：转载需注明出处，二次创作需获得作者许可。' },
    { title: '素材来源', body: '素材来源占位：站内公开素材遵循其原始授权协议。' },
    { title: '免责声明', body: '免责声明占位：架空作品均为虚构创作，不代表任何现实立场。' },
  ],
}
