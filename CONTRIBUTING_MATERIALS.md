# 素材接收与处理规范

本仓库的素材接收区用于收集成员提交的图片、地图、文案和结构化数据。它是一个短期收件箱，不是第二套正式资源目录。处理完成后，经过审核的文件必须进入现有网站资源目录；处理记录和原始提交包进入 content-inbox/processed/ 或 content-inbox/rejected/。

## 资源目录地图

提交前先确认目标文件应该落在哪里，避免新建平行资源系统。

| 用途 | 正式目录 | 说明 |
| --- | --- | --- |
| 阅读器地图素材 | public/collection/ | 与 public/collection/SOURCES.md 一起维护；现有图片有同名 JSON 元数据。 |
| 开场 Atlas 墙 | public/atlas-wall/ | 装饰性地图板；来源和授权写入该目录的 SOURCES.md。 |
| 地图页面素材 | public/maps/ | 地图页面使用的素材。 |
| 品牌媒体 | public/brand/ | 品牌介绍和品牌媒体。 |
| 成员头像与作品 | src/assets/members/ | 成员头像、成员作品及其引用。 |

正式资源目录以代码中的实际引用为准。dist/、output/、outputs/、package/ 和构建产物不是素材接收目标，也不要把它们当作新的资源库。

## 收件箱结构

    content-inbox/
    ├── images/       # 待审核图片；每张图片必须有同名 JSON
    ├── copy/         # 待审核文案；每份 Markdown 使用 YAML front matter
    ├── data/         # 经过审核的结构化数据草稿
    ├── processed/    # 已处理的原始提交包或处理记录
    └── rejected/     # 被拒绝的提交包和原因记录

成员只需要上传素材和文案，并填写对应的元数据。不要直接修改正式资源目录，也不要提交构建产物、依赖目录、账号信息或临时脚本。

## 状态与处理门槛

- 新提交使用 status: draft，完成自检后可改为 status: ready。
- 只有 status=ready 的图片、文案或数据才允许被处理。
- status 缺失、拼写错误或不是 ready 时必须停留在收件箱，并在 PR 中说明原因。
- 处理成功后，把原始提交包或处理记录移入 content-inbox/processed/；需要补充信息、来源或授权的移入 content-inbox/rejected/，并写清拒绝原因。
- 地图的版权、授权范围或来源未确认时，不能标记为 ready。这条规则优先于其他状态字段。

### 图片包

图片文件与 JSON 必须同名（扩展名除外），例如：

    content-inbox/images/europe-1894.jpg
    content-inbox/images/europe-1894.jpg.json

JSON 必须包含 status、target_page、target_section、action、alt、credit、license、source。action 使用 add、replace 或 update 之一；source 应该是可核查的路径或 URL。地图还要在 license 和 source 中写清版权状态和来源页面。

处理图片时：

1. 扫描新增文件和同名 JSON，拒绝孤立图片或孤立 JSON。
2. 核对图片的真实用途和代码引用，确认目标正式目录。
3. 将图片复制或移动到正式目录，并按仓库现有命名和压缩方式处理。
4. 若目标是 public/collection/，同步更新 public/collection/SOURCES.md 和同名元数据。
5. 若目标是 public/atlas-wall/，同步更新 public/atlas-wall/SOURCES.md。
6. 将原始收件包或处理记录移入 processed/；失败或授权不明则移入 rejected/。

### 文案包

文案使用 content-inbox/copy/*.md，文件顶部必须有 YAML front matter，字段与图片一致：

    ---
    status: draft
    target_page: home
    target_section: hero
    action: update
    alt: ""
    credit: ""
    license: original
    source: member-provided
    ---

正文只放拟上线文案。处理前请核对页面实现和文案字典的实际字段；处理后在 PR 中说明落点、旧文案是否保留，以及是否需要翻译或无障碍调整。

### 数据包

结构化数据放在 content-inbox/data/，必须说明目标页面、字段映射、来源和授权。只有在目标结构和校验规则明确后才可标记 ready。不要把凭据、导出账号数据或个人敏感信息当作网站数据提交。

## 安全与版权

严禁提交密码、Token、API Key、.env 文件、私钥、Cookie、会话内容、访问链接中的敏感参数或任何不必要的个人敏感信息。发现后立即停止处理，阻止相关内容提交或继续传播；不要将其移入 rejected/ 或任何仓库目录，也不要在 PR 描述、评论或日志中复制其内容。

若已经提交或推送，只记录不含敏感值的问题说明并通知维护者。由维护者按泄漏处置流程撤销或轮换相关凭据，评估并清理历史记录、缓存和副本；仅删除或移动当前文件不能消除泄漏。敏感信息处置优先于上述 processed/ 与 rejected/ 归档规则。

图片、地图和文案都必须有可核查的 credit、license、source。版权未确认的地图不能标记 ready，也不能进入正式目录。对于用户提供的素材，仍需确认网站的获准使用范围；“来自用户”不等于默认拥有再发布许可。

## 处理者检查清单

- [ ] 已扫描 PR 新增文件，确认没有隐藏文件、构建产物、依赖目录或敏感信息。
- [ ] 每张图片都有同名 JSON；每份文案都有 YAML front matter。
- [ ] 所有必填字段均已填写，status 确认是 ready。
- [ ] 已识别真实正式资源目录，并确认没有重复建立资源系统。
- [ ] 地图来源、版权和许可已核查；未确认的地图保持非 ready。
- [ ] 已按现有目录约定更新 SOURCES.md、引用或文案字典。
- [ ] 已运行仓库现有的 lint、build 和适用测试，并记录结果。
- [ ] 已把处理后的提交包移入 processed/ 或 rejected/。
- [ ] PR 只描述实际改动；不推送密钥，不创建远程 PR。

## 标准 PR 描述

复制下面的模板到 PR 描述，并删除不适用的行：

    ## 素材接收

    ### 内容
    - [ ] 图片
    - [ ] 文案
    - [ ] 数据

    ### 收件箱文件
    <!-- 列出 content-inbox/ 下的新增文件，并说明每个包的 status。 -->

    ### 正式资源落点
    <!-- 写明实际落入 public/collection、public/atlas-wall、public/maps、public/brand 或 src/assets/members 的文件。 -->

    ### 元数据与版权
    - target_page:
    - target_section:
    - action:
    - alt:
    - credit:
    - license:
    - source:
    - [ ] 地图版权和来源已确认，或明确保持非 ready。

    ### 检查结果
    - [ ] 已扫描 PR 新增文件
    - [ ] pnpm lint
    - [ ] pnpm build
    - [ ] 适用测试：
    - [ ] 处理记录已移入 content-inbox/processed/ 或 content-inbox/rejected/

    ### 备注
    <!-- 说明未处理项、拒绝原因或需要维护者决定的事项。 -->

## GPT 处理提示词

把下面的提示词和待处理 PR 一起提供给 GPT。它只负责分析和提出可审阅的处理结果；没有明确的 status=ready 时不得改动正式资源目录。

    你正在处理这个网站仓库的素材接收 PR。请先扫描 PR 新增文件和 diff，识别真实的正式资源目录及代码引用；不要新建第二套资源系统。重点检查 public/collection、public/collection/SOURCES.md、public/atlas-wall、public/maps、public/brand 和 src/assets/members。

    逐项检查：
    1. 图片是否有同名 JSON；文案是否有 YAML front matter。
    2. 元数据是否包含 status、target_page、target_section、action、alt、credit、license、source。
    3. 只有 status=ready 才能处理。地图的版权、许可或来源未确认时，禁止将其视为 ready。
    4. 拒绝密码、Token、API Key、.env、私钥、Cookie、会话内容和其他敏感信息。
    5. 根据代码真实引用把 ready 文件放入正确的正式目录；同步维护相应的 SOURCES.md、元数据或文案字典。
    6. 处理完成后，把原始包或处理记录放入 content-inbox/processed/；缺字段、来源或授权不明的放入 content-inbox/rejected/并写明原因。
    7. 运行仓库已有的 lint、build 和适用测试，不新增临时测试体系。

    输出：
    - 发现的新增文件和安全/版权问题；
    - 每个文件的处理决定及正式落点；
    - 实际改动清单；
    - lint、build、test 的命令与结果；
    - 仍需维护者确认的事项。

    除非 PR 明确授权并且检查全部通过，否则不要推送、创建远程 PR、发送消息或提交任何凭据。
