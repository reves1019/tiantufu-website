# Design Motion · 原创动效原语

[使用说明与来源](../../../docs/design-studio/README.md)

所有实现只依赖 React、CSS 和浏览器 API。可以在管理员“动效制作”内调参后下载包含本目录和完整入口的可运行源码包。

- `TransitionStage`：variant、options、replay、reduced。
- `TransitionLayer`：children、preset、phase、duration、distance、reduced；离场内容 inert。
- `MotionText`：text、variant、options、replay、reduced；中文/emoji 字素分割和完整辅助文本。
- `MotionButton`：children、variant、options、reduced、disabled、onClick。
- `ScrollScene`：variant、options、replay、reduced；独立滚动区，无滚轮接管。

options 为 duration（ms）、distance（px）、stagger（ms）、color（六位十六进制颜色）。默认值及范围见 model.ts。reduced 只能增加减少动态，不能覆盖用户系统设置。

动画仅处理呈现。不要将预览按钮的本地点击次数当作真实点赞，也不要把视觉组件当作访问权限或数据持久化。
