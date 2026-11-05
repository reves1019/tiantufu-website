/** 来源提供学习线索；本库实现独立编写，来源名称不代表源码许可或官方集成。 */
export interface MotionSource {
  id: string
  name: string
  url: string
  exampleUrl: string
  focus: string
  evidence: string
  reuse: string
  verifiedOn: string
}

export const motionSources: MotionSource[] = [
  {
    id: 'landing-love',
    name: 'Landing Love',
    url: 'https://www.landing.love/',
    exampleUrl: 'https://www.landing.love/sites/artemiilebedev-2/',
    focus: '横向内容序列与轮播节奏',
    evidence: 'Artemii Lebedev 详情页明确标注横向滚动并介绍交互轮播。图库可读取，原站本轮访问超时；未声称复核其完整动画。',
    reuse: '参考内容推进原理独立重写。图库展示不等于源码授权；不复制原站品牌、作品或脚本。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'land-book',
    name: 'Landbook',
    url: 'https://land-book.com/',
    exampleUrl: 'https://land-book.com/websites/101933-fragment-studio-A-independent-designer-for-visual-identity-websites-and-product-design',
    focus: '轻缩放、上浮与透明度层次',
    evidence: 'Fragment Studio 图库记录可读取。沿作者链接访问 fragment.im 返回 200，运行时观察到小幅 translateY、scale 与 opacity 入场；图库直接浏览器访问遇到 403。',
    reuse: '从观察到的运动组合独立重写，参数采用本项目设置。未取得该站源码许可，不分发其实现或素材。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'awwwards',
    name: 'Awwwards',
    url: 'https://www.awwwards.com/',
    exampleUrl: 'https://adoratoriostudio.medium.com/case-study-awwwards-website-ac1c6ed8acb7',
    focus: '覆盖层承接页面更换与遮罩揭幕',
    evidence: '主站本轮超时或返回 403。已读取原制作方 Adoratorio 的 2018 大会网站案例，作者说明 SVG 响应式页面转场；这是历史一手案例，不代表当前主站实现。',
    reuse: '依据公开原理独立设计覆盖与退出序列，不复制历史项目源码、视频或品牌；不把参考文章当作源码授权。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'one-page-love',
    name: 'One Page Love',
    url: 'https://onepagelove.com/',
    exampleUrl: 'https://onepagelove.com/made-by-igor',
    focus: '文字节奏与滚动触发显现',
    evidence: 'Made by Igor 详情说明连续滚动转场、字体动效与 Glitch。原站返回 200，可读到分词 DOM，但本轮截图停在覆盖层，未完成视觉全程验证。',
    reuse: '参考分词与归位思路独立重写；不复制原作者字体、文案、WebGL 预览或未授权源码。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'lapa',
    name: 'Lapa Ninja',
    url: 'https://www.lapa.ninja/',
    exampleUrl: 'https://www.lapa.ninja/post/playfolly/',
    focus: '上浮显现、纯淡入与内容层次',
    evidence: 'Playfolly 记录及原站可访问。原站运行时实际观察到 appearUp 的平移与透明度变化，以及 fadeIn；没有提取整站样式。',
    reuse: '参考入场机制独立编写轻量预设，不复制站点截图、录像、品牌与源码。',
    verifiedOn: '2026-11-05',
  },
  {
    id: '21st',
    name: '21st.dev',
    url: 'https://21st.dev/',
    exampleUrl: 'https://21st.dev/@chamaac/components/shimmer-button',
    focus: '按钮扫光与可调节组件',
    evidence: 'Chamaac Shimmer Button 条目及作者公开 registry 已读取，观察到文字渐变背景循环。该作者仓库列 MIT；不能据此推断全部 21st 条目的许可。',
    reuse: '本项目用 CSS 独立实现扫光，不复制该组件或自动安装依赖；若以后复制单项源码，须另行保留对应许可和署名。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'siteinspire',
    name: 'Siteinspire',
    url: 'https://www.siteinspire.com/',
    exampleUrl: 'https://www.siteinspire.com/website/11135-blond',
    focus: '克制的画廊显现与作品优先的排版',
    evidence: 'BLOND 详情与原站可访问，已观察大字号开场、简短标签和作品网格。没有稳定捕获其具名转场，未声称验证精确轨迹或时长。',
    reuse: '以布局和阅读层次为参考，独立设计显现预设；图库记录不构成源码或品牌素材授权。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'ui-layouts',
    name: 'UI Layouts',
    url: 'https://www.ui-layouts.com/',
    exampleUrl: 'https://www.ui-layouts.com/components/randomized-text-effect',
    focus: '随机字符归位与文字节奏',
    evidence: 'Randomized Text Effect 官网直接展示 React 源码：随机字符逐步固定为目标文本。官方 ui-layouts/uilayouts 仓库 LICENSE 为 MIT，署名 UI LAYOUT。',
    reuse: '参考一般字符归位机制独立实现，并补取消、Unicode 与无障碍处理。没有复制源码；免费仓库许可不自动覆盖 Pro 产品。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'react-bits',
    name: 'React Bits',
    url: 'https://www.reactbits.dev/',
    exampleUrl: 'https://www.reactbits.dev/text-animations/split-text',
    focus: '逐字上浮与模糊显字',
    evidence: '已核查 Split Text、Blur Text 官方说明。DavidHDev/react-bits 的 LICENSE.md 当前含 MIT + Commons Clause 条件及组件、工具导出物的分发限制。',
    reuse: '仅参考一般动效模式独立重写；本制作端不复制、不重新打包分发 React Bits 原组件，也不导出其工具产物。不是官方组件安装包。',
    verifiedOn: '2026-11-05',
  },
  {
    id: 'uiverse',
    name: 'Uiverse',
    url: 'https://uiverse.io/',
    exampleUrl: 'https://uiverse.io/vinodjangid07/lucky-bulldog-57',
    focus: '按钮箭头微动效与背景填充',
    evidence: '条目索引可读，直接 HTML 请求遇到 403。通过官方 Galaxy 仓库核查 lucky-bulldog-57 的箭头位移，以及 nice-walrus-6 的分层覆盖；页面分别列有 MIT 与署名。',
    reuse: '独立设计 CSS 反馈，不复制作者 SVG 或完整按钮。若以后复制 MIT 源码仍需保留其版权和许可文本，不能只因可预览便任意转载。',
    verifiedOn: '2026-11-05',
  },
]
