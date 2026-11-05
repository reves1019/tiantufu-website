# 六个灵感站的转场研究

核查日期：2026-11-05。范围为用户指定的六个灵感图库，每站选取一个可定位实例；不是完整抓取这些图库的所有网站。下文区分直接观察、站方描述与本项目的实现建议。

这些页面提供展示或案例，不等于允许复制其整站源码、品牌或图像。本轮没有把第三方品牌素材纳入网站，也没有取得以下实例的开源源码。制作端的相应模式应标为“参考重写”，而非“原站源码”。

## 快速索引

| 来源 | 具体实例 | 可核实的模式 | 本项目可以提炼的最小单元 |
| --- | --- | --- | --- |
| Landing Love | Artemii Lebedev | 图库明确标注 Horizontal Scroll、交互轮播 | 横向内容推进与上一项/下一项 |
| Landbook | Fragment Studio | 原站实际出现平移+轻缩放+透明度入场 | soft-scale、fade-up |
| Awwwards | 2018 Conference 制作方案例 | 原作者说明 SVG 响应式页面转场 | 遮罩揭幕、覆盖层分阶段离场 |
| One Page Love | Made by Igor | 图库说明滚动触发转场、字体动效、Glitch | 逐项文字揭示、错位后归正 |
| Lapa Ninja | Playfolly | 原站实际 CSS appearUp / fadeIn | 上浮显现、纯淡入 |
| Siteinspire | BLOND | 原站大字号开场、主体作品网格与简短标签 | 克制的画廊显现与内容连续性 |

表格最后一列是原创实现方向。它不是对原站算法、时长、参数或源码的复刻声明。

## 1. Landing Love：有方向的内容序列

- 入口：[Landing Love](https://www.landing.love/)，[Horizontal Scroll 分类](https://www.landing.love/categories/horizontal-scroll/)。主站和分类页可读取。
- 实例：[Artemii Lebedev 详情](https://www.landing.love/sites/artemiilebedev-2/)，原站链接为 [artemiilebedev.com](https://artemiilebedev.com/)。
- 证据：详情页列出 Horizontal Scroll、Portfolio、Minimal；说明 Webflow 作品集具有交互轮播及 GSAP / ScrollTrigger / Lenis 运动。这里的技术信息来自图库介绍，并非本轮复制或完整审计该站源码。
- 边界：原站浏览器访问在 20 秒内未完成 DOMContentLoaded，所以没有声称已复核该站的具体横滑曲线、速度或完整动画。
- 提炼建议：把“有顺序的作品横向推进”整理为选中索引 + translateX / opacity；保留前后按钮与键盘操作，不劫持所有页面滚轮。横移进入和退出应方向一致。
- 来源性质：视觉及交互参考；未确认源码许可。

## 2. Landbook：平移与小幅缩放的组合

- 入口：[Landbook Motion](https://land-book.com/motion)。网页读取工具可以读取，直接浏览器访问详情页遇到 Cloudflare 403，本轮没有绕过。
- 实例：[Fragment Studio 详情](https://land-book.com/websites/101933-fragment-studio-A-independent-designer-for-visual-identity-websites-and-product-design)，[作者档案](https://land-book.com/fragment) 指向 [fragment.im](https://www.fragment.im/)。
- 证据：图库有 Animation、Parallax、3D、Framer 标签；原站独立浏览器返回 200。实际 `document.getAnimations()` 中读取到透明度 0.001→1，以及 `translateY(-12px) scale(0.95)`→`none`、`translateY(16px) scale(0.98)`→`none` 的关键帧。
- 观察结论：标题/内容通过较小位移、接近 1 的比例和淡入形成层次；不是所有内容都需要大角度翻转。
- 提炼建议：提供轻缩放、向上淡入两个参数化预设，避免复制其字体、布局、文案和品牌。上述原站数值只作为观察记录，本项目应采用适合天图府的幅度。
- 来源性质：直接运行时观察 + 图库说明；未取得源码许可。

## 3. Awwwards：覆盖层承接页面更换

- 入口：[Awwwards](https://www.awwwards.com/)。本轮文本访问超时，Edge 直接访问返回 403；同样没有绕过。
- 一手补充：[Adoratorio Studio — Case Study: Awwwards Conference Website](https://adoratoriostudio.medium.com/case-study-awwwards-website-ac1c6ed8acb7)，2018-03-01，本文公开可读取。
- 证据：这是 Awwwards 大会网站原制作方的说明。作者描述 SVG 与响应式页面转场，使用 GSAP；另说明封面动画以 alpha 信息构造遮罩。页面还说明换页时获取 JSON 数据。
- 时间与实现边界：这是历史制作案例，不代表 2026 主站的实现。封面视频遮罩与页面转场是文中的两个技术点，不能混称为同一套算法。
- 提炼建议：独立实现“旧内容 → 覆盖层 → 新内容 → 覆盖层退出”的状态序列；可用 CSS clip-path 或 transform 写遮罩/幕布，保持路由和焦点逻辑独立。不必引入该历史项目的 Vue、旧 webpack 或视频素材。
- 可选一手补充：[Andy Reff 的 2025–26 作品集回顾](https://andrewreff.com/projects/a-portfolio-that-talks-back) 说明其过去版本使用透视滚动和逐字揭示。作者称获得 Awwwards Honorable Mention；本轮未从 Awwwards 主站独立复核获奖记录，也未把当前新版页面当作旧版效果。
- 来源性质：原制作方历史案例；未取得可复制的转场源码或其许可证。

## 4. One Page Love：让文字参与转场

- 入口：[One Page Love](https://onepagelove.com/)。
- 实例：[Made by Igor 详情](https://onepagelove.com/made-by-igor)，原站 [madebyigor.com](https://www.madebyigor.com/)。详情发布于 2026-11-03。
- 证据：图库说明其连续滚动触发转场、编辑式排版和失真项目预览，并列出 Scroll Effects、Typographic、Glitch。原站 Edge 返回 200，DOM 存在分词 `.word` 元素及变换，但本轮截图停在黑色覆盖层，未完成视觉全程验证。
- 提炼建议：使用有语义的完整文本 + 装饰性分词层，按序把词从偏移/裁切状态归位。为“减少动态”直接显示完整内容，不复制 CRT/WebGL 项目预览或原文案。
- 边界：逐字/逐词的确切延迟和失真算法未在本轮验证。不能把原创的分词 CSS 示例称为 Igor 的原始代码。
- 来源性质：图库明确描述、有限 DOM 证据；完整动态观察未通过。

## 5. Lapa Ninja：简单入场也能形成层次

- 入口：[Lapa Motion](https://www.lapa.ninja/motion/)。栏目明确提供站点录像。
- 实例：[Playfolly 详情](https://www.lapa.ninja/post/playfolly/)，[Playfolly 原站](https://playfolly.com/)。
- 证据：原站 Edge 返回 200；实际 CSS 动画 `appearUp` 从 opacity 0、translateY(20%) 到 opacity 1、translateY(0)，另有纯 opacity 的 `fadeIn`。页面采用大型标题、右侧说明和颜色选择控件。本轮只记录运行时动画特征，未提取整站样式。
- 提炼建议：提供 fade-up 与 fade 作为可读性优先的预设，把距离/时长/延迟参数与实际业务内容分开。颜色选择对背景的联动可作为调色预览，但不把它误称为路由转场。
- 来源性质：直接运行时观察。图库页注明截图属于各自作者；没有把原图或录像纳入制作端。

## 6. Siteinspire：作品和排版先于动效

- 入口：[Siteinspire](https://www.siteinspire.com/)。
- 实例：[BLOND 详情](https://www.siteinspire.com/website/11135-blond)，[BLOND 原站](https://www.blond.cc/)。详情发布于 2026-10-29。
- 证据：原站 Edge 返回 200。实际截图显示大字号品牌开场、窄标签、Work / Office 导航，以及后续大图作品网格。可读文本和项目链接与图库记录一致。
- 边界：本轮没有稳定捕获某一个具名 CSS 或 Web Animations 转场，不能报告其精确轨迹/时长。观察到的布局和阶段画面可作为视觉参考，不能从两张截图反推原始动画算法。
- 提炼建议：做轻淡入或由裁切窗口显露作品的独立预设，优先让作品保持完整比例、标题可读、焦点可见；把这种实现明确标为项目方重写。
- 来源性质：直接布局观察，动画参数未验证；未确认源码许可。

## 本机研究证据与接入注意

- 只读浏览器截图位于 `output/design-research/`，是本机研究缓存，不属于网站运行素材。包括 Playfolly、BLOND、Fragment 和访问失败/黑屏记录。
- 没有登录这些网站、订阅付费内容、绕过 403、执行下载的第三方代码，或复制品牌资产到 `public/`。
- React 实现可使用项目已有 CSS / GSAP。应响应系统减少动态设置；快速切页保留最后意图，退出内容应 inert；触摸操作有等价按钮。
- 来源站只是灵感入口。制作端应同时显示实例链接、证据层级、原创实现标记；不要用统一“已提取源码”标签掩盖各站差异。
