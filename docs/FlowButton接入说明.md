# 流动箭头按钮

本项目已有 React、TypeScript 与 Tailwind CSS v4，无需初始化新项目或重新安装样式框架。可复用 UI 放在 `src/components/ui`；与本项目 `src` 结构对应，不是项目根目录的 `components/ui`。本按钮不依赖 shadcn 的主题或上下文，不需要运行 shadcn CLI 覆盖现有配置。

- 组件：`src/components/ui/flow-button.tsx`。
- 局部样式：同目录的 `flow-button.css`，由组件自动导入。全站样式仍为 `src/index.css` 与 `src/exhibition.css`。
- 图标依赖：`lucide-react` 已加入 package.json 与锁文件。
- 使用相对路径导入；本项目尚未配置 `@/` 路径别名，不能直接照抄示例中的别名。

```tsx
import { FlowButton } from '../components/ui/flow-button'

<FlowButton text="关于天图府" onClick={openAbout} />
<FlowButton variant="solid" text="翻阅地图馆藏" onClick={openWorks} />
```

默认描边款，`solid` 为朱红主按钮。支持原生按钮属性、disabled、aria 属性和 ref，默认 type=button，避免放进表单时意外提交。

箭头移动和扩散层采用 transform/opacity，不用每帧更新 React，也不动画修改圆形的宽高。键盘 focus-visible 同样触发效果；减少动态偏好下不做箭头换位和扩散动画。预留至少 48px 点击高度。

本轮替换首页、社团介绍、创作主题、新闻、文化、新闻详情与赛事页的主要行动入口；外链 CTA 也使用同一动效，文案继续读取已有管理员内容。筛选、关闭、翻页等高频操作控件保留更轻的状态反馈，避免干扰阅读。浏览器实测键盘聚焦、箭头交接、扩散层、作品集和社团介绍跳转；390px 手机无横向溢出。lint 与 build 通过，仍保留既有热更新与主包体积警告；未测量帧率、未实际切换系统减少动态设置、未发布线上。
