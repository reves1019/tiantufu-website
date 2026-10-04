# 天图府 Supabase 云端后端

网站保留离线模式；只有设置 Supabase 环境变量并应用本目录的 SQL 后，登录、成员审核、共享内容、实时更新与图片上传才切换到云端。云端账号使用邮箱登录，成员注册默认待审核，管理员编辑共享站点内容；管理员在内容管理中显式执行首次迁移，避免旧设备内容自动覆盖已有云数据。

## 1. 创建项目并应用数据库结构

1. 在 Supabase 创建一个新项目，记下 Project URL 和 `publishable` key（旧项目可使用 anon/public key）。
2. 打开项目的 SQL Editor，将 `supabase/migrations/202609290001_tiantufu_cloud_backend.sql` 全文运行一次。
3. 在 Authentication 设置中启用 Email 登录；建议启用邮箱验证，并配置允许访问的网站 URL。
4. 在 Authentication → Users 中邀请/创建三位管理员的邮箱。新用户会自动创建为 `member + pending`，不会因填写用户元数据而获得管理员权限。
5. 确认这三位用户都已在 `public.profiles` 生成记录后，打开 [管理员初始化 SQL 模板](supabase/bootstrap_admins.template.sql)，在本机副本中替换三个邮箱占位符，再由项目所有者在 SQL Editor 执行。模板会把且仅把这三位设为管理员，并分别绑定到现有 Reves、圣雄、白菜成员主页；运行后检查结果正好三条。模板会把名单外已有管理员降为成员，所以必须确认这三位就是唯一管理员后再运行。不要将真实管理员邮箱写入公开客户端代码或提交到仓库。

管理员绑定的成员主页 ID 与本地预置账号保持一致：`shengming-reves`、`shengxiong-gandi`、`zixu-debaicai`。数据库客户端权限没有授予修改 `role/status/member_id` 的能力；之后如需更换管理员，仍由项目所有者在受控 SQL Editor 中重新运行名单配置。

## 2. 本地开发配置

复制 `.env.example` 为 `.env.local`，填入 Project URL 和 publishable/anon key，然后重启 Vite：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_你的公钥
```

`publishable`/`anon` key 是浏览器公开标识，安全边界由 RLS 提供。**绝不能**把 `service_role` 或 Supabase secret key 写入 `.env.local` 的 `VITE_*` 变量、源码、内容 JSON 或发给协作者。此仓库已忽略本机 `.env` 文件。

## 3. Vercel 环境变量

在 Vercel 项目 Settings → Environment Variables 中添加相同的 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY`，选择需要的环境并重新部署。不要把任何 service-role/secret key 添加到 Vercel 的 `VITE_*` 变量。

## 4. 数据权限与媒体路径

- 公共访客只能读取已审核成员资料与站点公开内容。
- 注册触发器始终将新账号建为待审核成员；只有管理员 RPC 可以审批/拒绝。
- 成员只能更新自己的昵称、简介和头像；全站内容更新仅对管理员开放。
- 图片桶 `tiantufu-media` 公开读取；管理员可管理桶内媒体，成员只能在 `avatars/<自己的 Supabase user id>/...` 路径上传/更新/删除头像。
- 图片最大 10 MiB，允许 JPEG/PNG/WebP/GIF/AVIF。应由应用生成不含用户输入路径片段的文件名。
- 共享内容以 `site_content` 的单一 JSON 文档保存，并加入 Realtime publication；成员资料表 `profiles` 也加入 publication，用于同步新申请、审核状态和个人资料变更。客户端仍须在接入后将本机内容迁移/初始化到云端。
- 成员审核通过由数据库事务只追加新成员卡与其代表作，并回传服务器上的最新文档；不会把审核设备的旧版整站 JSON 覆盖到云端。云内容尚未初始化或不可用时，管理界面会禁用“通过并生成主页”。

## 5. 首次内容迁移与验收

1. 通过管理员邮箱登录已配置的站点，在内容管理看到 `等待首次内容迁移`。
2. 选择保存着最新、最完整网站内容的那台浏览器，点击“首次同步本机内容”。本机图片（含 Base64、地图、品牌标识和首页建筑）先上传到公开共享素材库，引用转换为 HTTPS，再初始化 JSON。同一引用只上传一次，内容哈希用于重试复用。第三方 HTTPS 图片保留原链接；不复制第三方私有资源。图片无法读取/超过 10 MiB/格式不支持时，报错标明字段，原内容不替换。本操作要求云端 `site_content` 仍为空，并由数据库原子检查；已初始化的云端不会被覆盖。中途失败已成功上传的图片可能留在桶中，核对后由管理员清理，不自动删除。
3. 在另一台设备登录同一个管理员账号，确认页面内容已加载；修改一处测试文案并确认另一设备实时更新。
4. 管理员审核测试成员后确认生成个人主页；用成员账号验证只能改自己的昵称、头像和简介。
5. 通过账号管理发送重置邮件；链接会打开网站的密码重设界面。管理员图片应进入共享素材库，成员图片只能写入自己的头像目录。

### 并发编辑与断线恢复

管理员的整站保存带服务器版本条件；旧请求不能清掉较新草稿。另一位管理员抢先保存时，显示“版本冲突”，暂停覆盖并保留本机草稿。使用“备份草稿并加载云端”先下载 JSON、在本机另存恢复副本，再加载最新云端内容，之后手动合并。不要把“本机已保存”当作“云端已同步”。重新连接会读取最新文档补齐错过的消息；实时订阅和数据库权限仍需按下方验收项在真实项目测试。

## 6. 接入尚需的信息

要把现有登录框、账号审核、成员个人资料、内容编辑器和图片上传真正切到云端，还需要：

1. Supabase Project URL；
2. `publishable` key（或旧版 anon/public key；不是 service-role）；
3. 三位管理员各自用于 Supabase 登录的邮箱地址；
4. 决定由哪位管理员首次将现有本地网站 JSON 导入 `site_content`（只选一台浏览器作为初次迁移源，避免各浏览器旧数据互相覆盖）。

本地旧账号密码不能安全地自动迁移为 Supabase 密码；管理员需要用邮箱邀请/密码重置建立云端凭据。环境变量生效后，在线集成验收和生产重新部署仍需执行；当前尚无真实项目凭据，因此这里的云端链路尚未通过真实项目验证。
