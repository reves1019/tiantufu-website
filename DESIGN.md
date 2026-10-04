---
name: "天图府 · 地图档案馆"
description: "暖纸、墨色与朱红构成的地图阅读视觉系统"
colors:
  cinnabar: "#a33428"
  cinnabar-hover: "#82261d"
  cinnabar-focus: "#992e23"
  warm-paper: "#e5d8bd"
  paper-light: "#ecdfc4"
  paper-sheet: "#dfd0ae"
  ink: "#32251c"
  ink-secondary: "#594533"
  ink-muted: "#756047"
  archive-dark: "#100e0b"
  reader-dark: "#161511"
  viewport-dark: "#0b0b09"
  archive-title: "#ede3d0"
  archive-copy: "#d0c3a9"
typography:
  display:
    fontFamily: "\"Noto Serif SC\", \"Playfair Display\", \"STSong\", \"SimSun\", serif"
    fontSize: "clamp(38px, 3.65vw, 62px)"
    fontWeight: 500
    lineHeight: 1.28
    letterSpacing: "-.035em"
  headline:
    fontFamily: "\"Noto Serif SC\", \"Playfair Display\", \"STSong\", \"SimSun\", serif"
    fontSize: "clamp(38px, 4.5vw, 68px)"
    lineHeight: 1.45
    letterSpacing: ".05em"
  title:
    fontFamily: "\"Noto Serif SC\", \"Playfair Display\", \"STSong\", \"SimSun\", serif"
    fontSize: "22px"
    lineHeight: 1.6
  body:
    fontFamily: "system-ui, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
    fontSize: "13px"
    lineHeight: 1.9
  label:
    fontFamily: "ui-monospace, \"Cascadia Code\", Consolas, monospace"
    fontSize: "11px"
    letterSpacing: ".12em"
  button-label:
    fontFamily: "\"Noto Serif SC\", \"Playfair Display\", \"STSong\", \"SimSun\", serif"
    fontSize: "13px"
rounded:
  square: "0px"
  stamp: "2px"
  inherited-control: "6px"
  inherited-tag: "9999px"
spacing:
  filter-gap: "8px"
  compact-rhythm: "12px"
  reading-gutter: "16px"
  mobile-gutter: "22px"
  section-rhythm: "24px"
  reader-story-gutter: "26px"
components:
  button-primary:
    backgroundColor: "{colors.cinnabar}"
    textColor: "#f8ecd2"
    typography: "{typography.button-label}"
    rounded: "{rounded.stamp}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.cinnabar-hover}"
  button-text:
    textColor: "#8b3024"
    height: "44px"
    padding: "5px 0"
  nav-item:
    textColor: "{colors.ink-secondary}"
    size: "13px"
  nav-item-active:
    textColor: "{colors.ink}"
  filter-chip:
    backgroundColor: "#181610a8"
    textColor: "#d5c9b2"
    rounded: "{rounded.square}"
    padding: "10px 16px"
    height: "44px"
  filter-chip-selected:
    backgroundColor: "#92352433"
    textColor: "#fff1d8"
  filter-select:
    backgroundColor: "#181610"
    textColor: "{colors.warm-paper}"
    padding: "8px"
    height: "44px"
  folio-sheet:
    backgroundColor: "{colors.paper-sheet}"
    rounded: "{rounded.square}"
  reader-close:
    width: "44px"
    height: "44px"
    rounded: "{rounded.square}"
  scene-selector:
    backgroundColor: "#e5d8bd40"
    textColor: "#463225"
    width: "83px"
    padding: "10px 6px 7px"
---

# Design System: 天图府 · 地图档案馆

## 2026-10-02 修缮更新（优先于下方旧快照）

当前公共页正迁移为“深墨地图展览”：底色 #0e0e0c、暖纸字色 #e9e1d2、朱红行动色 #a33428。首页屋顶与字帘已移除；不再使用塑料罗盘、密集星轨或遮蔽地图的粒子效果。

首页、地图探索、作品集、作者主页及本轮的创作主题/主题子页/社团介绍/联系，采用统一展览容器。Geist 用于操作与归属信息，Noto Serif SC 用于导读与标题，楷体只用于少量落款。主要地图完整呈现，不裁切；装饰缩影不承担地图阅读。

本轮主题页复用公开作品档案，作品阅读与作者主页为独立动作。社团介绍以长文、桌面侧栏停驻、横向年鉴组织；联系以四个行动入口和联系方式清单组织。占位统计与未确认联系方式有明确提示。旧内容路径与管理库数据保留。

用户验收意见“整体交互感不足、动效偏少”已记录在 docs/修缮清单.md，仍待专项处理。本轮局部进入与悬停反馈不代表动效专项完成。新闻、赛事等其他深层页尚未完成统一；云端账号与生产部署不属于本轮验收。

以下为改版前的材料与页面记录，屋顶、字帘、浅纸作者页及旧尺寸描述不再代表上述已改页面。

## Overview

**Creative North Star: "地图档案馆"**

以已确认的“地图档案馆”为视觉北极星：暖纸、墨色与朱红承接天图府现有指南针印记、哑光屋顶和文字帘。首页保留可触发的建筑场景；馆藏与阅读器转入安静的深墨阅读桌；作者页回到纸面。深浅变化是同一种材料的两面，不是另起一套霓虹身份。

地图原图与真实作者内容优先，界面负责编目、进入、放大和阅读。纸纤维、水墨边纹、细描边和受控的纸页抬升提供质感，避免塑料高光与泛滥霓虹；不为装饰编造作者手记、人数或历史事实。

本文件扫描当前首页、馆藏、作者页与地图阅读器的实现。管理员界面及其他继承页面不在本页组的视觉 QA 范围；本轮四项修正复核通过不等于全站、全部折叠以下内容或云端权限已验收。

**Key Characteristics:**

- 暖纸 / 深墨双材料场景，朱红负责行动与定位。
- 衬线中文标题、系统正文、等宽档案编号。
- 地图主阅读入口完整呈现，缩略图仅用于导航。
- 哑光屋顶、文字帘和指南针印记作为既有签名。
- 清楚的阅读入口、作者入口、筛选状态与键盘焦点。

规范值位于上方 frontmatter。来源为 `src/index.css`、首页、馆藏、作者页、导航及地图阅读器；扩展的运动、断点、阴影与可独立预览组件位于 `.impeccable/design.json`。公共纸面通过局部 CSS 变量覆盖旧深色主题；旧变量名不等于其当前纸面颜色。

## Colors

暖纸与墨褐建立材料连续性，朱红是印记和行动色，深墨只为作品阅读退后。

### Primary

- **朱红印记**（`cinnabar`）：纸面主按钮、状态线与品牌强调；悬停加深，焦点仍需可见。
- **朱红悬停 / 焦点**（`cinnabar-hover` / `cinnabar-focus`）：来源于现有纸面按钮和纸面品牌变量，不替代深墨页面的既有焦点值。

### Neutral

- **暖纸 / 浅纸 / 地图纸页**（`warm-paper` / `paper-light` / `paper-sheet`）：首页底材、局部纸面层次、馆藏完整地图承载面。
- **主墨 / 次墨 / 淡墨**（`ink` / `ink-secondary` / `ink-muted`）：纸面标题、次要正文与标签。
- **档案室 / 阅读桌 / 图窗深墨**（`archive-dark` / `reader-dark` / `viewport-dark`）：馆藏背景、全屏阅读器框架和拖动图窗。
- **档案标题 / 档案正文**（`archive-title` / `archive-copy`）：深墨馆藏中的文字；不是纯白高光。

**The The Material Continuity Rule Rule.** 纸面与深墨阅读桌共享同一复古材料语言；不得用塑料高光或霓虹替代。

色阶预览由侧文件的 OKLCH 八阶派生，不是额外上线颜色或新的 CSS 源。

## Typography

**Display Font:** Noto Serif SC / Playfair Display，回退 STSong、SimSun 与 serif。  
**Body Font:** 系统字体，回退 Segoe UI、PingFang SC、Microsoft YaHei。  
**Label/Mono Font:** 系统等宽字体，回退 Cascadia Code、Consolas。

**Character:** 衬线承担章节与作品名称，正文让地图说明易读，等宽只负责编号和细标签。英文衬线与楷体是继承资源，不为本页组新增字体体系。

### Hierarchy

- **Display:** 首页场景标题，frontmatter 的 display 角色；手机最终覆盖为（32px / 1.25）。
- **Headline:** 馆藏页标题；手机覆盖为（38px）。
- **Title:** 馆藏作品名称；阅读器主标题另为（20px / 1.5），手机（16px）。
- **Body:** 阅读札记（13px / 1.9）；馆藏引导另为（14px / 1.9）。作者简介沿用（14px）及宽度上限。
- **Label:** 等宽档案计数与页签（10–11px），正文中不大段使用高字距。
- **Author heading:** 继承的作者名称为（36px），小屏断点以上（48px），并由笔记页保持（1.5）行高。

**The The Heading First Rule Rule.** 主要页标题直接开场；档案编号放在纸页标签、阅读器计数和页脚，不在标题上方堆叠编号眉题。

## Layout

页组沿用 React / PageStack，每页自身滚动，文档 body 不承担长页滚动。主要容器最大宽度（1700px）。固定导航桌面高度（86px），手机（72px），内容需避让导航。

首页桌面以屋顶文字帘居中、左右阅读文字和场景切换为结构；平板收紧场景宽度，手机转为顺序流：签名场景、标题/动作、说明、页脚。手机最终文字帘高度（340px），页内侧距（24px）。

馆藏桌面内边距为（130px 5.5% 40px），标题与引导为（1fr / .48fr）双列；纸页网格为三列，间距（48px 32px）。宽度至（1100px）改两列；至（767px）改一列，外边距（22px），顶部（96px），纸页间距（44px）。筛选自动换行，不挤成横向溢出。

阅读器桌面为可伸缩图窗加（320px）札记栏，平板札记栏（260px）；手机改纵向可滚动，阅读区（62dvh），纸页说明跟随其后。作者页在大屏使用（0.9fr / 1.1fr）两列，窄屏按内容顺序堆叠。

## Elevation & Depth

材料层次为主，阴影只支持纸页、屋顶和轻微抬升。首页纸纤维叠层及水墨背景使用 multiply；深墨阅读器不加泛光。导航仍有继承的轻模糊（12px），不是玻璃卡片系统。

### Shadow Vocabulary

- **纸面容器静态 / 悬停**：现有公共纸面容器的微弱墨褐阴影，值收录于侧文件。
- **馆藏纸页**：局部纸页阴影与悬停上移（12px）、轻旋转（-1deg）；过渡（.45s），减少动态时取消。
- **屋顶纸影**：已有屋顶海报的 drop-shadow；保留哑光与低透明度，不能变成塑料浮雕。
- **作者页容器**：笔记页明确关闭继承 shadow 类；不把旧发光样式记录为本世界的阴影规范。

**The The Artwork First Rule Rule.** 馆藏纸页和主阅读画布完整适配地图；作者附加缩略图允许裁切，但不能把缩略图当主阅读图。

## Shapes

主要地图纸页、筛选、阅读器工具以直角为主；朱红按钮用轻微印章角（2px）。继承的导航图标按钮、作者返回按钮与附加缩略图仍为（6px）；作者标签仍为胶囊形，不把这些局部例外扩展到所有地图容器。

细边框用于纸页、页签、状态与图窗，不追求厚重卡片边框。指南针保留现有品牌图形；屋顶与文字帘保持现有轮廓和中文竖排字符。

## Components

### Buttons

主页“进入”动作是细下划线文字入口，次动作更安静；继承的朱红实底按钮仍可用于明确主行动。主要阅读和筛选触控面保持至少（44px），导航继承图标按钮为（40px），不要把两者混作已统一尺度。

文字入口悬停变朱红、箭头轻移；实底按钮悬停加深。保留（2px）可见焦点轮廓与（3px）偏移；纸面导航另指定朱红焦点。关闭控件为内联 SVG 交叉图形，不使用文本叉号。

### Chips

馆藏主题筛选是直角、细线、深墨底；选中态通过朱红边框、微红底、浅纸文字和 `aria-pressed` 同时表达。计数字号（11px）；手机按钮文字（12px）并减少横向内边距。

### Cards / Containers

馆藏以档案纸页而非泛用营销卡片呈现：编目页签、完整地图、右下阅读入口、下方标题和独立作者入口。地图区域为（3:2），使用 contain；作者附加缩略图使用 cover，仅用于导航。主作品纸页移动不遮挡阅读动作。

### Inputs / Fields

本页组现有字段是展开筛选中的原生 select，深墨底、浅纸字、细纸色边框、最小高度（44px），最大宽度（220px）；继承全局可见焦点。不得据此声称管理表单或云端登录状态已验收。

### Navigation

暖纸导航使用现有字标，标题项为（13px / .04em）。默认次墨，悬停和当前页主墨；当前页另有朱红细下划线和 `aria-current="page"`，不是所有导航项同时强调。小于（768px）折叠为菜单，移动选中项用微红底和朱红字；联络按钮仅大屏出现。

### Map reader

全屏深墨框架、纸面札记栏、缩放/复位工具与缩放后出现的定位小图。代码包含滚轮、双击、拖动、双指缩放、键盘缩放/复位/移动、Escape 关闭、焦点约束和返回触发点；图片失败和加载状态有文字反馈。功能是否通过实际浏览器验收以相应测试报告为准，本文件不是新的功能验收证明。

### Roof / glyph curtain

沿用哑光屋顶、竖排字帘、已有指南针印记与侧边场景预览。场景切换（850ms），说明入场（650ms）；交互状态禁用重复切换，减少动态时直接切换。不要为动态装饰牺牲纸面、阅读入口或移动首屏可发现性。

## Do's and Don'ts

### Do:

- Do 沿用已确认的暖纸、墨色、朱红与既有品牌资产。
- Do 用完整地图、可见的“阅读地图”入口和独立作者入口建立阅读顺序。
- Do 保留筛选、返回位置、键盘焦点和减少动态偏好。
- Do 明确标注待作者补充的札记，保持真实内容和公开/管理库边界。

### Don't:

- Don't 引入塑料、霓虹或另一套视觉世界。
- Don't 用装饰编号眉题挤占主要标题前的注意力。
- Don't 把主阅读地图裁成卡片封面，或添加遮挡地图的图片光标拖尾。
- Don't 把本页组修正验收写成全站、云端账号或生产部署已通过。

