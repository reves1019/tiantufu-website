# Interaction Atlas

本目录是天图府六种交互的唯一实现，也是可复制到其他 React 项目的学习代码。

- [中文学习入口](../../../learning/interaction-atlas/README.md)
- [接口与迁移说明](../../../learning/interaction-atlas/复用指南.md)
- `examples/` 提供六份最小接入示例和独立练习页。
- 每个组件自动导入 `styles.css`；仅依赖 React，不依赖网站 store、账号或路由。
- `model.ts` 保存可脱离浏览器验证的计算，`dom.ts` 保存焦点/动效适配。

原 `components/lab/AtlasInteractions.tsx` 只负责兼容导出，修改组件请在此目录进行。
