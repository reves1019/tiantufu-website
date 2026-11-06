# 素材收件箱

这里是成员上传图片、地图、文案和结构化数据的临时收件箱。成员只上传素材和文案，不直接改 public/ 或 src/assets/ 正式目录。

## 快速规则

1. 把图片放进 images/，并在同一目录添加 JSON。JSON 文件名使用“图片完整文件名 + .json”，保留图片扩展名，例如 photo.webp + photo.webp.json（不是 photo.json）。
2. 把文案放进 copy/，文件使用 YAML front matter；可复制 ../templates/copy.md。
3. 结构化数据放进 data/，说明字段映射和来源。
4. 新提交默认 status: draft；只有全部必填字段和版权信息确认后才能改成 status: ready。
5. 处理器只处理 status=ready。地图版权或来源未确认时不能 ready。
6. 处理后把原始包或记录放进 processed/；缺信息或不合规的包放进 rejected/并写清原因。
7. 禁止密码、Token、API Key、.env、私钥、Cookie、会话内容和其他敏感信息。

## 必填元数据

图片 JSON 和文案 front matter 都要填写：

- status
- target_page
- target_section
- action
- alt
- credit
- license
- source

action 使用 add、replace 或 update。source 必须能被维护者核查，地图还必须写明版权状态和来源页面。

## 正式落点

处理时先看代码中的真实引用，再使用现有目录：

- 阅读器地图：public/collection/，并维护 public/collection/SOURCES.md
- Atlas 墙：public/atlas-wall/，并维护 public/atlas-wall/SOURCES.md
- 地图页面：public/maps/
- 品牌媒体：public/brand/
- 成员头像和作品：src/assets/members/

不要创建第二套 assets/、maps/ 或 collection/ 正式目录。完整流程、PR 模板和 GPT 处理提示词见根目录的 CONTRIBUTING_MATERIALS.md。
