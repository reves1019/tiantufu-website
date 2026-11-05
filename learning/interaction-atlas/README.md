# 天图府交互代码学习库

把本次六种交互拆成可以操作、阅读、修改和验证的小单元。每个单元包括带注释的真实组件、最小接入示例、状态说明、动手练习与验收方法。网站和练习页引用同一份实现。

新增进阶入口：[动效制作端](../../docs/design-studio/README.md)。管理员可参考十个设计站的核查记录，预览 14 个原创实现的转场/文字/按钮/滚动效果，并应用转场或导出完整示例。

## 先打开练习页

本机网站已运行时，访问 [交互学习页](http://127.0.0.1:5173/learning/interaction-atlas/index.html)。这不是网站的新导航栏目，也不改变首页。

也可以在项目根目录单独启动：

```powershell
pnpm.cmd learning:dev
```

打开 [独立学习页](http://127.0.0.1:5180/learning/interaction-atlas/index.html)。保留该终端，结束时按 Ctrl+C。已有项目依赖即可运行，不需要 Supabase 或账号；端口占用时不要结束不明进程，可以使用正在运行的 5173 地址。

页面中每课的“最小接入示例”和“阅读带注释的组件源码”由 Vite 直接读取真实源文件，不是手工复制的旧代码。上方可切换减少动态、清空列表、移除末项和复位；下方状态栏帮助观察事件是否被父组件接受。

## 建议学习顺序

先读 [共同原理与复用指南](./复用指南.md)，再按表阅读。理解 React 的 props、useState 和事件处理即可开始；第 4 课会额外使用 Canvas。

| 课 | 最重要的概念 | 带注释的实现 | 可直接运行的接入示例 |
| --- | --- | --- | --- |
| [01 分类标签](./lessons/01-分类标签.md) | 受控状态与语义标签 | [ShaderTabs.tsx](../../src/recipes/interaction-atlas/ShaderTabs.tsx) | [TabsExample.tsx](../../src/recipes/interaction-atlas/examples/TabsExample.tsx) |
| [02 丝绸海报](./lessons/02-丝绸海报.md) | 坐标归一化与 CSS 变量 | [SilkPoster.tsx](../../src/recipes/interaction-atlas/SilkPoster.tsx) | [PosterExample.tsx](../../src/recipes/interaction-atlas/examples/PosterExample.tsx) |
| [03 伸缩卡带](./lessons/03-伸缩卡带.md) | 预览和确认是两种状态 | [ExpandingStrip.tsx](../../src/recipes/interaction-atlas/ExpandingStrip.tsx) | [StripExample.tsx](../../src/recipes/interaction-atlas/examples/StripExample.tsx) |
| [04 刮刮卡](./lessons/04-刮刮卡.md) | 图层、采样、坐标换算 | [ScratchCard.tsx](../../src/recipes/interaction-atlas/ScratchCard.tsx) | [ScratchExample.tsx](../../src/recipes/interaction-atlas/examples/ScratchExample.tsx) |
| [05 表情反应](./lessons/05-表情反应.md) | null 与互斥选择 | [ReactionBar.tsx](../../src/recipes/interaction-atlas/ReactionBar.tsx) | [ReactionExample.tsx](../../src/recipes/interaction-atlas/examples/ReactionExample.tsx) |
| [06 流式轮播](./lessons/06-流式轮播.md) | 多种输入归一为切换意图 | [ImageFlow.tsx](../../src/recipes/interaction-atlas/ImageFlow.tsx) | [FlowExample.tsx](../../src/recipes/interaction-atlas/examples/FlowExample.tsx) |

每一课按“操作一次 → 看状态 → 阅读实现 → 修改一个参数 → 验证键盘和手机”的顺序学习。练习默认不保存，刷新或点“复位所有练习”可以重来。

## 文件怎么分工

```text
learning/interaction-atlas/
  README.md、复用指南.md、lessons/   学习材料
  index.html                       独立练习入口
src/recipes/interaction-atlas/
  六个具名 TSX                      唯一组件实现
  types.ts                         公开内容/状态类型
  model.ts                         无 DOM 的交互计算
  useSelection.ts                  受控/非受控选择
  dom.ts                           焦点、颜色与动效偏好适配
  CardArt.tsx、styles.css           共用图像与视觉层
  examples/                        示例、状态观察器、原创示意图
src/components/lab/
  AtlasInteractions.tsx            旧导入路径的兼容出口
  atlas-interactions.css           网站展廊、文化与赛事页面布局
```

## 构建与验证

```powershell
pnpm.cmd test:learning
pnpm.cmd learning:build
pnpm.cmd learning:preview
```

构建输出在 `output/interaction-learning`；预览地址为 [4180 学习页](http://127.0.0.1:4180/learning/interaction-atlas/index.html)。需要 HTTP 服务，不直接双击构建后的 HTML。该产物只有练习页面和相关 JS/CSS，不打包网站 public 图片目录。

浏览器回归默认访问运行中的 5173：

```powershell
pnpm.cmd test:learning-browser
# 完整测试会自行启动隔离测试站点，也包含以上两类学习测试：
pnpm.cmd test
```

默认使用 Windows Edge，可用 `TTF_BROWSER_PATH` 指向其他 Chromium 浏览器。对独立构建验收时，可将 `TTF_LEARNING_URL` 设为完整的 4180 学习页地址。详细验证范围见 [验收记录](./验收记录.md)。

## 使用范围

这些组件处理展示和交互意图。真实点赞、权限、上传、评论、持久化和原图阅读器由调用页面接入。练习图为程序生成的几何示意图，不代表真实地理数据；没有引入视频品牌、视频素材或站内作者作品。源代码仍属于当前项目，未擅自增加开源许可或发布 npm 包。
