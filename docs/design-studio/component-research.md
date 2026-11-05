# 动效制作端：组件来源研究

核查日期：2026-11-05。范围：21st.dev、UI Layouts、React Bits、Uiverse。以下记录实际访问的页面和源码；本项目采用独立实现，未把第三方完整组件或品牌素材打包进导出库。

## 21st.dev：按单项核查

- [首页](https://21st.dev/) 可访问，提供多作者组件目录。
- 选定条目：[Shimmer Button，作者 Chamaac UI / chamaac](https://21st.dev/@chamaac/components/shimmer-button)。页面列出预览、调用示例、来源和单项许可证。
- [作者官方 registry 源码](https://www.chamaac.com/r/shimmer-button.json) 经直接 HTTP 请求返回 200，实际源码采用文字背景裁切和渐变位置循环，使用 motion/react；registry 的 dependencies 未完整列出这个运行时导入，因此不宜盲目运行安装命令。
- [该项 MIT 许可证](https://raw.githubusercontent.com/amarnathdhumal/chamaacui/main/LICENSE)：署名为 Copyright (c) 2026 Amarnath。若复制或实质改编源代码，应携带版权和许可文本。不能据此推断 21st 上所有条目采用相同许可。
- 独立实现建议：用伪元素或文字渐变的 CSS 位移动画表达扫光；提供 duration、color、disabled、focus-visible 和减少动态回退，不需要额外 motion 依赖。

## UI Layouts：文字解码与图像预览

- [组件目录](https://www.ui-layouts.com/components) 可访问，列有 Randomized Text、Scroll Text、Image Reveal、Clip-Path 等具体页面。
- [Randomized Text Effect](https://www.ui-layouts.com/components/randomized-text-effect) 的官网页面直接展示 React 源码。其过程是先改变随机字符，再逐步固定最终文本前缀。
- 独立实现建议：以 elapsed/duration 计算已经固定的字符数，用单个可清理的 rAF 循环更新其余字符。保留原文作为辅助技术可读文本；使用 Unicode 字符/字素而非直接 split('')，避免拆坏 emoji。文本变化、重播和卸载均应取消旧循环。
- [Image Reveal](https://www.ui-layouts.com/components/image-reveal) 说明的是悬停跟随指针的图片预览，不应误标成整页遮罩转场；[公开 live preview](https://www.ui-layouts.com/live-components/image-reveal) 可访问。
- [官方仓库 MIT 许可证](https://github.com/ui-layouts/uilayouts/blob/main/LICENSE) 署名为 Copyright (c) 2024 UI LAYOUT。免费仓库许可不自动覆盖单独的 Pro 产品，也不适用于同组织其他未核查仓库。

## React Bits：观察模式，独立实现

- [首页](https://www.reactbits.dev/) 和 [文字效果目录](https://www.reactbits.dev/c/text-animations) 可访问。
- [Split Text](https://www.reactbits.dev/text-animations/split-text)：逐字或逐词错峰进入。可用可读原文加 aria-hidden 的视觉字符、transform/opacity 和索引延迟独立实现。
- [Blur Text](https://www.reactbits.dev/text-animations/blur-text)：从模糊状态过渡到清晰。可用有上限的 blur、opacity 和位移组合独立实现，避免正文长时间不可读。
- [官方 LICENSE.md](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) 在核查时是 **MIT + Commons Clause License Condition v1.0**，Copyright (c) 2026 David Haz。该文本允许在应用/网站/产品中使用，但限制把组件本身单独、成包或移植后再分发；工具及导出物另有具体限制。
- 因制作端包含源码导出，本轮只参考上述一般交互原理，独立编写组件。没有把 React Bits 源文件、工具或 exports 当成本项目可分发素材，不能标注为“React Bits 官方组件已安装”。

## Uiverse：按钮状态与微动效

- [首页](https://uiverse.io/) 与 [按钮分类](https://uiverse.io/ui/animated-buttons) 可读取。直接 Node 请求条目 HTML 遇到 403；没有绕过访问控制。源代码改从其公开、官方关联的 [Galaxy 仓库](https://github.com/uiverse-io/galaxy) 读取。
- [vinodjangid07 / lucky-bulldog-57](https://uiverse.io/vinodjangid07/lucky-bulldog-57) 的 [官方 HTML/CSS](https://github.com/uiverse-io/galaxy/blob/main/Buttons/vinodjangid07_lucky-bulldog-57.html) 已核查。机制是悬停时箭头水平位移并改变透明度。独立实现应改用 transform，补 focus-visible、触摸按压与 reduced-motion；无需拷贝作者的 SVG 图案。
- [cssbuttons-io / nice-walrus-6](https://uiverse.io/cssbuttons-io/nice-walrus-6) 的 [官方 HTML/CSS](https://github.com/uiverse-io/galaxy/blob/main/Buttons/cssbuttons-io_nice-walrus-6.html) 已核查。机制是三块圆形覆盖层错峰升起并结合 SVG 黏连滤镜；可蒸馏为轻量的背景填充反馈。
- 上述两条页面分别列有 MIT 文本与作者署名。Galaxy README 对视觉署名表达为鼓励，但复制源码时仍须保留 MIT 要求的版权与许可文本。cssbuttons-io 自述为收集者，因此不将其误称为该按钮的唯一原创作者。

## 建议进入本项目的六个模式

| 模式 | 主要参考 | 最小状态/机制 | 本轮采用方式 |
| --- | --- | --- | --- |
| 逐字上浮 | React Bits Split Text | trigger + 字符序号 → 延迟与位移 | 独立实现 |
| 模糊显字 | React Bits Blur Text | trigger → blur/opacity 归零 | 独立实现 |
| 字符解码 | UI Layouts Randomized Text | 时间进度 → 固定前缀长度 | 独立实现，补取消/无障碍 |
| 扫光按钮 | 21st / Chamaac | hover/focus → 渐变横移 | 独立实现，CSS |
| 前行箭头 | Uiverse / Vinod Jangid | hover/focus/press → 箭头位移 | 独立实现，CSS |
| 背景填充 | Uiverse / cssbuttons-io | hover/focus/press → 覆盖层展开 | 独立实现，轻量化 |

这些是从具体案例提炼的可复用模式，不是像素级复制或已安装第三方官方组件的声明。制作端应显示参考条目链接，并让用户在导出包中查看本项目自己的实现与接入说明。
