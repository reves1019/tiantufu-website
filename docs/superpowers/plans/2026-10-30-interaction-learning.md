# 交互代码学习库 Implementation Plan

> **For agentic workers:** 使用当前 Codex 流程在本会话逐项执行。writing-plans 的 Windows 适配允许在未安装 Superpowers 执行技能时继续；用户已明确要求完成整理，无须再次审批。

**Goal:** 将本次六种交互蒸馏为能阅读、运行、修改、验证和复用的学习库。

**Architecture:** `src/recipes/interaction-atlas` 保存唯一组件实现，旧导入路径转为兼容出口。`learning/interaction-atlas` 保存中文课程和独立练习页入口；练习与网站引用同一实现，不复制业务数据。

**Tech Stack:** 现有 React 18、TypeScript、CSS、Canvas、Vite、Node、Playwright；无新增依赖。

**Spec:** 用户目标“蒸馏这些代码，作为学习库”，范围为 `docs/交互图鉴实验室.md` 的六种交互及文化/赛事两处接入。

## Global Constraints

- 保留网站视觉、hash 路由、编辑索引、高清图和真实作者。
- 练习数据采用明确标注的原创示意图，不访问账号/云端，不拷贝站内地图素材。
- 讲清状态、事件、视觉与无障碍的对应关系；每课提供改参数练习和验收方法。
- 原路径可继续导入；示例接受编译与浏览器检查。
- 不提交 Git，不部署，不更新用户记忆。

## Review Focus

- 空列表及选中条目被删除：回退到首项或空态。
- 受控父级拒绝更新：组件不得自行改变实际选择。
- 手机纵向滚动和取消手势：不得误切换轮播。
- 缩放后刮卡坐标与重新覆盖：显示尺寸不等于画布像素尺寸。
- 减少动态：关闭位移和动画，但选择、揭晓与打开作品仍可用。

## Task 1: 可读且唯一的组件实现

**Files:** `src/recipes/interaction-atlas/*`、兼容出口 `src/components/lab/AtlasInteractions.tsx`、原样式文件。

**Interfaces:** 保留六个组件及现有 Props；提炼无 DOM 的键盘索引、滑动方向、画布坐标和透明比例函数。动效通过可替换函数读取，默认支持系统和 `html[data-motion]`。

- [x] 拆分、注释组件；保留类名和状态语义。
- [x] 为提炼的计算补边界测试，并执行既有六组件浏览器回归。

## Task 2: 可运行的学习材料

**Files:** `learning/interaction-atlas/README.md`、六课、复用指南、`index.html`；源码 `examples/`；独立 Vite 配置。

**Interfaces:** 每例独立导出，可直接嵌入；学习页显示状态，提供减少动态和复位控制；独立产物不包含账号或云模块。

- [x] 写学习路径、状态模型、关键代码定位、练习与答案提示。
- [x] 加入六例、示意图和独立构建命令。
- [x] 浏览器验证受控状态/重置/键盘/手机/减少动态和图片加载。

## Task 3: 接入索引及验收

**Files:** `README.md`、`docs/交互图鉴实验室.md`、动效知识库、`package.json`、`scripts/test-all.mjs`。

- [x] 关联学习入口，记录 flex 布局动画的真实例外。
- [x] 运行学习库构建、网站 build/lint 和完整 test；检查生成页面与资源。
- [x] 对照六组件、六课程、示例、复用边界、网站兼容性逐项核验后交付。

实际证据见 [学习库验收记录](../../../learning/interaction-atlas/验收记录.md)。
