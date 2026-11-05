# 天图府动效制作端

管理员登录后，在底部工具栏点击 **动效制作**，或直接访问 [本机制作端](http://127.0.0.1:5173/#design-studio)。

本次把十个指定站点的参考整理成 14 个独立实现的效果，保留来源实例和核查边界。它们可以预览、调参和导出；页面转场还可以直接应用到当前网站。网站最初仍使用原有转场，浏览和试调不会自动更改它。

## 使用方法

1. 用左侧类别、来源或搜索找到效果。右侧显示真实组件，可重播；滚动效果在预览框内部滚动。
2. 调整时长、位移、文字错峰和强调色。无关参数会禁用；文字/按钮可以输入自己的短文案。
3. 需要检查无动效状态时，勾“预览减少动态”；系统减少动态始终优先。
4. 选择页面转场后，点击“应用此页面转场”，再点“到社团介绍试用”。配置随原网站内容保存，可撤销本次应用或恢复原有转场。
5. 文字、按钮和滚动效果通过“复制接入代码”放到指定页面；“下载完整源码包”包含当前参数、组件、CSS、React 入口、配置及来源说明。不能仅复制调用代码而省略组件文件。

制作端只有管理员可进入。应用操作要求内容已加载，云模式下还要求同步就绪。预览、导出与保存是分开的：下载代码不会改账号或网站内容，应用转场也不等于把本机代码部署到官网。

## 14 个效果

| 类别 | 效果 | 适用位置 |
| --- | --- | --- |
| 页面转场 | 轻浮入场、静谧叠化、横向推幕、遮罩揭幕、圆形开场、景深靠近 | 章节、资料页、作品详情 |
| 文字 | 逐字升起、由虚入实、字符归位 | 短标题与引言 |
| 按钮 | 墨色填充、一束扫光、指针引力 | 少量主要操作 |
| 滚动 | 滚动显影、叠层视差 | 作品摘要和展览章节 |

圆形开场、视差和指针引力包含本项目的原创演绎，不表示找到并复制了参考站的相同效果。具体对应关系在制作端“设计原理与来源”内。

## 十站来源

| 来源 | 本轮参考用途 | 具体记录 |
| --- | --- | --- |
| [Landing Love](https://www.landing.love/sites/artemiilebedev-2/) | 横向内容推进节奏 | [图库研究](./gallery-research.md) |
| [Landbook](https://land-book.com/websites/101933-fragment-studio-A-independent-designer-for-visual-identity-websites-and-product-design) | 小幅上浮与缩放 | [图库研究](./gallery-research.md) |
| [Awwwards 原制作方案例](https://adoratoriostudio.medium.com/case-study-awwwards-website-ac1c6ed8acb7) | 历史大会网站的覆盖转场原理 | [图库研究](./gallery-research.md) |
| [One Page Love](https://onepagelove.com/made-by-igor) | 文字节奏与显现 | [图库研究](./gallery-research.md) |
| [Lapa Ninja](https://www.lapa.ninja/post/playfolly/) | 上浮/淡入层次 | [图库研究](./gallery-research.md) |
| [21st.dev](https://21st.dev/@chamaac/components/shimmer-button) | 按钮扫光 | [组件研究](./component-research.md) |
| [Siteinspire](https://www.siteinspire.com/website/11135-blond) | 作品优先的排版和层次 | [图库研究](./gallery-research.md) |
| [UI Layouts](https://www.ui-layouts.com/components/randomized-text-effect) | 随机字符逐步归位 | [组件研究](./component-research.md) |
| [React Bits](https://www.reactbits.dev/text-animations/split-text) | 分字和模糊显字的一般模式 | [组件研究](./component-research.md) |
| [Uiverse](https://uiverse.io/vinodjangid07/lucky-bulldog-57) | 按钮箭头与填充反馈 | [组件研究](./component-research.md) |

部分原站访问失败或只能核实图库描述，记录中已标明。Awwwards 使用原制作方公开的历史案例，不冒充当前主站源码；React Bits 的原组件未复制或打包进本库。制作端导出的是本项目独立实现，没有参考站的品牌图片、视频、字体或代码。

## 代码结构与复用

- [model.ts](../../src/recipes/design-motion/model.ts)：14 项注册表、参数校验、页面转场关键帧。
- [sources.ts](../../src/recipes/design-motion/sources.ts)：十站实例、证据、复用说明、核查日期。
- [TransitionStage.tsx](../../src/recipes/design-motion/TransitionStage.tsx)：可重播的转场预览与可复用内容层。
- [MotionText.tsx](../../src/recipes/design-motion/MotionText.tsx)、[MotionButton.tsx](../../src/recipes/design-motion/MotionButton.tsx)、[ScrollScene.tsx](../../src/recipes/design-motion/ScrollScene.tsx)：独立组件，业务行为由调用方传入。
- [useReducedMotion.ts](../../src/recipes/design-motion/useReducedMotion.ts)：系统与站内偏好，共用监听和清理模式。
- [exportKit.ts](../../src/recipes/design-motion/exportKit.ts)：读取实际源码生成 ZIP，不维护另一份组件副本。
- [DesignStudioView.tsx](../../src/views/DesignStudioView.tsx)：筛选、预览、参数、应用与导出界面。

无新增运行时依赖。独立包需要现有版本范围的 React/TypeScript/Vite；运行方法写在导出包 README。库中 SVG/纹理均由代码生成，不依赖网站素材。

## 页面转场如何保存

`SiteContent.designMotion` 为 `{ preset, duration, distance }`。旧内容没有该字段时补为 original / 400ms / 18px；未知预设回退原效果，时长和位移限制在合理范围内。配置使用已有 IndexedDB/云内容同步通道，不另建全站配置存储。

PageStack 在一次导航开始时固定配置，动画播放中收到新参数不会改变这一轮时序。快速导航保留最后意图，浏览器历史不重复写入中间页，旧页面保持 inert；中途开启减少动态会收束过渡并清理动画。

## 验证命令

```powershell
pnpm.cmd test:design-motion
# 以下浏览器测试需要先启动本机Vite；pnpm test会自动启动隔离测试站点：
pnpm.cmd test:design-studio
pnpm.cmd build
pnpm.cmd lint
pnpm.cmd test
```

浏览器测试只使用隔离本地账号/测试环境，不写用户浏览器与真实云数据。效果来源核查与本地验证不等于线上部署完成。

本轮具体结果和验证范围见 [验收记录](./验收记录.md)。
