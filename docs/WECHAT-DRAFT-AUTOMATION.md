# 微信公众号草稿箱自动化操作指南

> 适用账号：**订阅号**  
> 自动化范围：把仓库里的公众号稿（**标题 + 正文**）写入微信 **草稿箱**  
> **不会**：生成封面图、自动群发粉丝、跳过你在微信后台的审核/发表  
> 配套脚本：`scripts/wechat_draft_publish.py`  
> 凭证模板：`ops/wechat.env.example`  
> 本周内容仍可完全人工发；本指南供并行配置与后续使用。

---

## 一、整体流程（你要做什么）

```text
① 配置 AppID / AppSecret
② 在公众平台素材库上传一张固定封面
③ 查出该图的 media_id，写入配置
④ 用脚本把 wechat.md 推入草稿箱
⑤ 你在微信后台打开草稿 → 审核 → 发表
```

GEO Studio 看板与本流程无关；本流程只在终端 + 微信公众平台完成。

---

## 二、一次性配置

### 步骤 1：拿到 AppID 和 AppSecret

1. 打开 [微信公众平台](https://mp.weixin.qq.com/) 并登录订阅号。
2. 进入：**设置与开发 → 开发接口管理 → 基本配置**（部分后台文案为「设置与开发 → 基本配置」）。
3. 复制：
   - **开发者 ID（AppID）**
   - **开发者密码（AppSecret）**  
     （你口头说的 appkey，一般就是 AppSecret。若从未生成过，点「生成 / 重置」，并妥善保存。）
4. 若后台要求配置 **IP 白名单**：把你当前发稿电脑的公网 IP 加进去，否则后面调接口会失败。

**安全要求：**

- 不要把 AppID / AppSecret / media_id 发到聊天、邮件群或 Git。
- 不要提交 `.env.wechat` 到仓库（已被 `.gitignore` 忽略）。

### 步骤 2：在本机创建凭证文件

在终端执行（路径按你的电脑）：

```bash
cd "/Users/amber/Documents/vibe coding/skillver-geo-main"
cp ops/wechat.env.example .env.wechat
```

用编辑器打开：

`/Users/amber/Documents/vibe coding/skillver-geo-main/.env.wechat`

只改等号**右边**（示例值请换成你自己的，下面是格式示意）：

```env
WECHAT_APP_ID=wx开头的一串
WECHAT_APP_SECRET=你的AppSecret
WECHAT_AUTHOR=Skillver
WECHAT_THUMB_MEDIA_ID=
```

先填好前两行；`WECHAT_THUMB_MEDIA_ID` 在步骤 4 再填。

### 步骤 3：在公众平台上传固定封面图

1. 微信公众平台 → **素材管理**（或「内容与互动 → 素材管理」，以你后台菜单为准）。
2. 上传 **一张** 你准备长期复用的封面图（jpg/png 均可）。
3. 记住图片文件名，方便下一步对照。

脚本**不会**帮你生成封面；只复用你上传的这张。

### 步骤 4：查出封面的 `media_id` 并写入配置

配置好 AppID / AppSecret 后，在仓库根目录执行：

```bash
cd "/Users/amber/Documents/vibe coding/skillver-geo-main"
python3 scripts/wechat_draft_publish.py --list-images
```

终端会类似输出：

```text
共 N 张图片素材（本页 N）：
- name: skillver-cover.jpg
  media_id: 一长串字符
  url: https://...
```

把要用的那张的 `media_id` 整段复制，粘贴进 `.env.wechat`：

```env
WECHAT_THUMB_MEDIA_ID=这里粘贴刚才的media_id
```

保存文件。之后每篇公众号稿都复用这一张封面，无需再传图。

---

## 三、日常发稿（标题 + 正文进草稿箱）

### 稿件位置

本轮公众号稿在：

| 排期 | 文件 |
|------|------|
| 7/12 C16 | `content/publish-ready/C16/wechat.md` |
| 7/14 C13 | `content/publish-ready/C13/wechat.md` |
| 7/15 C15 | `content/publish-ready/C15/wechat.md` |
| 7/17 C01 | `content/publish-ready/C01/wechat.md` |
| 7/18 C05 | `content/publish-ready/C05/wechat.md` |

### 步骤 A：先预览（不调用微信）

```bash
cd "/Users/amber/Documents/vibe coding/skillver-geo-main"
python3 scripts/wechat_draft_publish.py \
  --markdown content/publish-ready/C16/wechat.md \
  --dry-run
```

确认打印出的 `title` 和 HTML 正文无误。

### 步骤 B：正式写入草稿箱

```bash
python3 scripts/wechat_draft_publish.py \
  --markdown content/publish-ready/C16/wechat.md
```

成功时会看到：

```text
draft_media_id: ...
已写入草稿箱（标题+正文）。请到公众平台 → 草稿箱 预览并人工发表。
```

### 步骤 C：你在微信后台完成审核与发表

1. 打开微信公众平台 → **草稿箱**。
2. 打开刚写入的草稿，检查标题、正文、封面。
3. 按你的习惯做修改（如有）。
4. **审核 / 发表 / 群发** 全部在后台人工完成。  
   脚本到此结束，**不会**自动推送给粉丝。

### 步骤 D：登记台账（GEO 要求）

发表成功后，把真实链接记入 `ops/publish-log.csv`（见 `ops/CONTENT-PUBLISHING-SCHEDULE-2026-07.md`）。

---

## 四、推荐工作节奏（与本周排期配合）

| 阶段 | 做法 |
|------|------|
| 本周（7/11–7/18） | 小红书、知乎继续人工发；公众号可人工发，或配置好后用脚本进草稿箱再后台发表 |
| 配置日（任意空闲） | 完成第二节一次性配置 |
| 每个公众号排期日 | dry-run → 写入草稿箱 → 微信后台审核发表 → 填 publish-log |

---

## 五、常见问题

| 现象 | 处理 |
|------|------|
| 提示缺少 `WECHAT_APP_ID` | 确认仓库根目录存在 `.env.wechat`，且等号右边已填写；在仓库根目录运行命令 |
| `access_token` / 40001 | AppSecret 错误，或 IP 未加入白名单 |
| `--list-images` 为空 | 先在素材管理上传图片，再重跑 |
| 新增草稿失败 / invalid media_id | `WECHAT_THUMB_MEDIA_ID` 填错或素材已删；重新 `--list-images` 并更新配置 |
| 标题被截断 | 微信标题上限约 32 字，脚本会自动截断并加省略号 |
| 想换封面 | 素材库换图或选另一张，更新 `WECHAT_THUMB_MEDIA_ID` 即可 |

---

## 六、文件清单

| 路径 | 作用 |
|------|------|
| `docs/WECHAT-DRAFT-AUTOMATION.md` | 本指南 |
| `ops/wechat.env.example` | 凭证模板（可提交） |
| `.env.wechat` | 你的真实凭证（本地创建，勿提交） |
| `scripts/wechat_draft_publish.py` | 自动化脚本 |
| `content/publish-ready/*/wechat.md` | 待发公众号正文 |

---

## 七、一句话记住

**配置一次 `.env.wechat`（AppID + AppSecret + 固定封面 media_id）→ 每次对 `wechat.md` 跑脚本进草稿箱 → 你在微信后台审核发表。**
