# 微信公众号草稿箱自动化操作指南

> 适用账号：**订阅号**  
> 自动化范围：把仓库里的公众号稿（**标题 + 正文**）写入微信 **草稿箱**  
> **不会**：生成封面图、自动群发粉丝、跳过你在微信后台的审核/发表  
> 配套脚本：`scripts/wechat_draft_publish.py`  
> 凭证模板：`ops/wechat.env.example`（**只作模板，禁止填写真实密钥**）  
> 真实凭证：仓库根目录 `.env.wechat`（gitignore，勿提交）

---

## 一、整体流程（你要做什么）

```text
① 只在 .env.wechat 配置 AppID / AppSecret（不要写进 example）
② 在公众平台素材库上传一张固定封面
③ --list-images 查出 media_id，写入 .env.wechat
④ 用脚本把 wechat.md 推入草稿箱
⑤ 你在微信后台打开草稿 → 审核 → 发表
```

---

## 二、一次性配置

### 步骤 1：拿到 AppID 和 AppSecret

1. 打开 [微信公众平台](https://mp.weixin.qq.com/) 并登录订阅号。
2. 进入：**设置与开发 → 基本配置**（或「开发接口管理 → 基本配置」）。
3. 复制 **AppID** 与 **AppSecret**。
4. 将本机公网 IP 加入 **IP 白名单**（否则接口会报 40164）。

**安全要求（必读）：**

- 真实密钥**只**写在 `.env.wechat`
- **禁止**写入 `ops/wechat.env.example`（该文件会进 git）
- 不要把密钥发到聊天；若已泄露，立刻在公众平台重置 AppSecret

### 步骤 2：创建本地凭证文件

```bash
cd "/Users/amber/Documents/vibe coding/skillver-geo-main"
cp ops/wechat.env.example .env.wechat
```

编辑 `.env.wechat`：

```env
WECHAT_APP_ID=wx开头的一串
WECHAT_APP_SECRET=你的AppSecret
WECHAT_AUTHOR=Skillver
WECHAT_THUMB_MEDIA_ID=
```

### 步骤 3–4：固定封面 media_id

1. 公众平台 → 素材管理 → 上传一张长期复用的封面图  
2. 运行：

```bash
python3 scripts/wechat_draft_publish.py --list-images
```

3. 把输出的 `media_id` 写入 `.env.wechat` 的 `WECHAT_THUMB_MEDIA_ID=`

---

## 三、日常发稿

### 单篇预览 / 上传

```bash
# 预览（不调微信）
python3 scripts/wechat_draft_publish.py \
  --markdown content/publish-ready/C13/wechat.md \
  --dry-run

# 写入草稿箱
python3 scripts/wechat_draft_publish.py \
  --markdown content/publish-ready/C13/wechat.md
```

### 批量

```bash
python3 scripts/wechat_draft_publish.py \
  --batch 'content/publish-ready/*/wechat.md' \
  --dry-run

python3 scripts/wechat_draft_publish.py \
  --batch 'content/publish-ready/*/wechat.md'
```

成功后到 **公众平台 → 草稿箱** 人工审核发表，并登记 `ops/publish-log.csv`。

本轮稿件：`C16/C13/C15/C01/C05` 的 `content/publish-ready/*/wechat.md`。

一键本机试跑（需已配置 `.env.wechat` 与封面 media_id）：

```bash
bash scripts/smoke-wechat-draft.sh
```

---

## 四、常见问题

| 现象 | 处理 |
|------|------|
| 缺少 `WECHAT_APP_ID` | 确认根目录有 `.env.wechat` 且已填写 |
| example 含密钥警告 | 立刻迁到 `.env.wechat` 并清空 example |
| Tunnel / 代理 403 | 换本机直连网络，或关闭拦截 api.weixin.qq.com 的代理后再试 |
| SSL CERTIFICATE_VERIFY_FAILED | macOS Python 缺根证书：双击「应用程序 → Python 3.14 → Install Certificates.command」，或 `pip3 install --user certifi` 后重试 |
| 40164 / IP 白名单 | 把本机公网 IP 加入公众平台白名单 |
| 40001 / 40125 | AppSecret 错误，重置后只写 `.env.wechat` |
| `--list-images` 为空 | 先在素材库上传图片 |
| invalid media_id / 40007 | 更新 `WECHAT_THUMB_MEDIA_ID` |

---

## 五、文件清单

| 路径 | 作用 |
|------|------|
| `docs/WECHAT-DRAFT-AUTOMATION.md` | 本指南 |
| `ops/wechat.env.example` | 空模板（可提交） |
| `.env.wechat` | 真实凭证（本地，勿提交） |
| `scripts/wechat_draft_publish.py` | 上传脚本 |

---

## 六、一句话

**密钥只进 `.env.wechat` → 配好封面 media_id → 对 wechat.md 跑脚本进草稿箱 → 微信后台人工发表。**
