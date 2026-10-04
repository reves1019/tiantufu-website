# 给网页设计 GPT 的执行指令：天图府全站交互升级

你正在维护“天图府·地图档案馆”网站。先阅读 `DESIGN.md`、`PRODUCT.md`、`docs/修缮清单.md`、`docs/动效与交互知识库-v0.1.md`，再检查所有 `src/components` 和 `src/views`。不要创建替代站点，不要改变路由/后端/发布权限，不要虚构内容。

## 目标

把站点从“已有很多局部动效”升级为一套可理解、可恢复、可访问的全站交互系统。参考 UI Layouts 的组件思路，但保持天图府的暖纸、深墨、朱红、地图阅读器气质。Image Accordion 只是其中一个案例，不是唯一改动。

## 交互系统要求

1. 为 idle、hover、focus、pressed、selected、loading、success、error、disabled 建立统一状态样式。
2. 所有弹窗、抽屉、搜索、移动菜单、Lightbox 使用统一焦点捕获、背景 inert、Esc 关闭、点击外部策略，并在关闭时恢复触发元素焦点。
3. 所有图像卡片和折叠内容支持键盘和触摸，不得只依赖 hover；折叠同步 `aria-expanded`/`aria-controls`/`inert`。
4. 页面深层入口使用稳定 ID，刷新、浏览器前进后退和分享 URL 不应依赖数组索引。
5. 图片、地图、搜索、管理员保存都必须有加载、失败、重试、空状态和成功反馈。
6. `prefers-reduced-motion` 与应用内“减少动效”都要取消位移、缩放、惯性、自动滚动和强制视差，保留即时状态。
7. 只用 transform、opacity、CSS 变量和 rAF 做连续动画；不要给同一区域叠加多个指针追踪 canvas。

## 组件级任务

- 导航：桌面/移动一致，打开移动菜单时锁定背景滚动，返回焦点；导航状态和深层 URL 同步。
- Image Accordion：桌面 hover/focus 展开一个面板，其余收缩；点击打开现有 Lightbox；移动端改为触摸点击 + 横向 snap；标题/描述使用渐变遮罩；图片失败显示标题和重试。
- Lightbox/地图阅读器：保留缩放、拖动、惯性和 minimap；补相邻图片预加载、加载进度、失败重试、拖动/缩放提示和分享/复制反馈（若产品允许）。
- 搜索：加入清空、结果计数、类型筛选、空状态建议、最近搜索；结果用 `aria-activedescendant` 或等价可访问模式。
- 作品/成员卡：支持明确 focus/pressed/selected 状态，不把内容放在 hover 才可见的文字里。
- 表单/管理员：加入 dirty state、保存中、成功、失败、重试和离开确认。
- 滚动/视觉：只加入能帮助阅读的 Image Reveal、Spotlight、轻微视差或分段滚动，禁止装饰压过地图主体。

## 执行顺序

先做状态/焦点/异常基座，再做导航和 URL，再做作品展架与 Lightbox，再做搜索/表单，最后做动效增强和性能优化。每一步都要保留现有地图与真实内容。

## 验收

运行项目已有 `pnpm lint`、`pnpm exec tsc -b`、`pnpm test`、`pnpm build` 及相关专项测试。检查 390、768、1024、1440 宽度；键盘 Tab/Enter/Space/方向键/Home/End/Esc；触摸展开、横向吸附、拖动和双指缩放；reduced-motion；图片 404；空结果；保存失败；快速连续点击；刷新深层 URL。报告通过、失败、未测量项目，不要声称已验证 60fps 或生产 Supabase。
