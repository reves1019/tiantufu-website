---
target: 天图府官网与获奖站差距及完善建议
total_score: 14
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\吕梓乔\\Documents\\Codex\\2026-08-12\\new-chat\\tiantufu-website\\src\\views\\HomeView.tsx"
target_fingerprint: "sha256:7ded001127e2103d91a04919ff0cf1500ea0b4ffd0d61131b300e30c2683da95"
target_path: "C:\\Users\\吕梓乔\\Documents\\Codex\\2026-08-12\\new-chat\\tiantufu-website\\src\\views\\HomeView.tsx"
timestamp: 2026-10-01T08-20-59Z
slug: src-views-homeview-tsx
closed: true
---
Method: dual-agent (A: /root/design_opinion_a · B: /root/design_opinion_b)

# 天图府官网设计评审 · 2026-10-01

范围：当前本地首页、作品集、成员页及图片弹层。只分析，不修复或部署。A 独立现场查看桌面首页、作品、成员、弹层；B 独立查看桌面及 390×844 首页/作品集并运行源码探测。两者自建标签已关闭，临时 viewport 已恢复。

## 产品特异性与整体判断

纸色、水墨、宋体、朱砂、屋檐文字帘和真实地图构成有辨识度的视觉世界。目前更接近有特色的舞台与作品货架，还不是可以探索的地图世界。核心机会在真实地图阅读与作者故事，不是增加特效数量。

## 优点

- 纸本首页有编辑感与品牌辨识度。
- 暗色作品画廊展示真实成员地图，文件夹抽出具有档案隐喻。
- 已有背景暂停、筛选状态、返回、Esc 等基础控制。受检手机首页/作品集未见横向溢出。

## 启发式评分

|启发式|分数/4|依据|
|---|---|---|
|状态反馈|3|当前导航、筛选、场景及图片页数|
|贴近真实世界|3|分类清楚，进入/体验名称偏抽象|
|控制与自由|2|有返回/暂停，弹层焦点漏出|
|一致性|2|作品与作者入口语义分裂|
|错误预防|n/a|本轮未评账号及编辑|
|识别优于回忆|2|需学习两种浏览路径，返回位置丢失|
|灵活与效率|n/a|展示面不以高级操作评分|
|美观与精简|2|主视觉有作者性，装饰和作品竞争|
|错误恢复|n/a|未触发网络及图片失败|
|帮助与文档|n/a|未评帮助流程|
|总计|14/24|58%，Acceptable，非奖项评分|

## 优先问题

1. P1 地图阅读不足：MemberView 代表作 object-cover 裁切，Lightbox 仅适配视口，缺少缩放拖拽及局部导航。先做完整比例地图阅读器，复位、缩略导航及可选作者注释。Suggested command: /impeccable shape。
2. P1 真实内容不足：序章、作者说明、档案仍有占位，默认档案复用三张地图。优先三位真实作者的完整作品档案，补背景、年代、创作方法和授权；未完成板块标筹备中或暂不展示。Suggested command: /impeccable clarify。
3. P1 弹层焦点漏出：A 实测打开 Lightbox 后一次 Tab 落到背景按钮。打开聚焦、背景 inert、Tab 圈定、关闭恢复触发点。Suggested command: /impeccable harden。
4. P2 手机叙事机械拉长：文字帘先占约460px，主行动接近首屏底端；作品页地图较晚出现。先地图/定位与入口，再故事说明；保留触摸趣味但缩短舞台。Suggested command: /impeccable adapt。
5. P2 浏览模型分裂：文件夹进成员，档案进作品；重复筛选且返回状态未保存。统一“看地图→读作品→认识作者”，保存筛选/位置。Suggested command: /impeccable distill。

## 认知负担与访客

中等认知负担：单一焦点、最少选择、工作记忆三个方面待收敛，不是全面选项墙。情绪路径从纸本好奇到作品兴趣，再因占位与重复图片形成谷底。
Jordan 初访者：抽象入口需要翻译；Casey 手机访客：主行动较晚且文案假设悬停；Sam 键盘访客：弹层焦点漏出已实测。

## 技术证据与边界

B 对 HomeView、WorksView、MemberView、Navbar 的 detector 输出 []，count=0，rules=[]，locations=[]，无误报。只表示没有命中该探测器规则，不代表全站通过。
CUA evaluate 为只读，未做注入预检、detect.js、live-server、overlay；不声称有浏览器探测叠加层。受检页面日志为空，受检图片未见已失败项；不是全站资源或性能证明。未测弱网、低端机、60fps、精确对比度。

## 较小观察

部分手机点击区为32-40px，低于44px舒适建议，不直接认定WCAG违规。顶部当前页只有视觉指示，宜补语义。红色头像霓虹可收敛为朱砂印痕。首页与画廊明暗分区可以保留，用统一字体、纸面边框与转场建立联系。

## 方向与定向问题

地图档案馆：一张旗舰地图、三个作者提供的细节热点，先保证地图能读再增加叙事。
方向选项：地图阅读 / 全站视觉统一 / 社团内容与招新。
范围选项：先做一件旗舰作品闭环 / 全站同步完善。
