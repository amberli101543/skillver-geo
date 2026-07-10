# GEO Studio 本地环境配置指南

> 目标：在本机启动 GEO Studio，访问 9 个 GEO 引擎（诊断跑批 / 单题试跑）。
> 代码目录：`skillver-geo/geo-studio/`

---

## 前置条件

| 依赖 | 版本 | 检查命令 |
|------|------|----------|
| Node.js | 20+ | `node -v` |
| Docker Desktop | 已启动 | `docker ps` |
| npm | 随 Node | `npm -v` |

---

## 一键配置

脚本会：复制 `.env`（若不存在）→ 启动 PostgreSQL（5433）+ Redis（6379）→ 安装依赖 → Prisma 迁移 → 生成 Client。

**macOS / Linux：**

```bash
cd "/path/to/skillver-geo-main/geo-studio"
bash ./scripts/setup-local.sh
```

**Windows（PowerShell）：**

```powershell
cd C:\path\to\skillver-geo\geo-studio
.\scripts\setup-local.ps1
```

配置完成后另开两个终端启动服务（见下方「启动服务」）。

**国内网络拉镜像卡住 / TLS 超时（常见）：** 不要干等 Docker Hub。先取消卡住的 pull（终端 `Ctrl+C`），再执行：

```bash
cd "/path/to/skillver-geo-main/geo-studio"
bash ./scripts/pull-images-cn.sh   # 从华为云镜像拉取并打回官方 tag
bash ./scripts/setup-local.sh
```

Apple Silicon（arm64）会自动拉 `pg16-linuxarm64`。若该源也失败，可换手机热点，或在 Docker Engine 配置 `registry-mirrors` 后重试。

---

## 手动配置（逐步）

### 1. 环境变量

在 `geo-studio` 根目录：

```bash
cp backend/.env.example backend/.env   # 若尚无 .env
```

本地 `.env` 预置：
- 看板登录：`admin` / `123456`
- API Token：`dev-key`
- 无引擎 Key 时连接器自动走 stub
- 可用 `DIAGNOSTIC_ENGINE_IDS` 控制跑批引擎与成本

### 2. 启动数据库

在 `geo-studio` 根目录：

```bash
npm --prefix backend run db:up
npm --prefix backend exec prisma migrate deploy
npm --prefix backend run prisma:generate
```

### 3. 启动服务

在 `geo-studio` 根目录开两个终端：

**终端 1 — Backend（API + Worker）**

```bash
npm --prefix backend run start:dev
```

**终端 2 — Web 看板**

```bash
npm --prefix web run dev
```

| 地址 | 用途 |
|------|------|
| http://localhost:5173 | GEO Studio 看板 |
| http://localhost:3000/health | API 健康检查 |
| http://localhost:3000/engines | 已注册引擎列表 |

看板登录：`admin` / `123456`（见 `.env` 中 `STUDIO_PASSWORD`）

---

## 接入真实引擎（live 模式）

在 `backend/.env` 填入对应 Key，然后：

```env
ENGINE_MODE=live
```

或只让某个引擎走 live（其余仍 stub）：

```env
KIMI_API_KEY=sk-...
KIMI_MODE=live
ENGINE_MODE=stub
```

### 各引擎配置项

| 引擎 | engineId | 必填 | 可选 |
|------|----------|------|------|
| 豆包 | `doubao` | `DOUBAO_API_KEY` | `DOUBAO_MODEL`（Ark 模型 ID 或 `ep-*`）、`DOUBAO_BASE_URL` |
| Kimi | `kimi` | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` | `KIMI_MODEL`、`KIMI_BASE_URL` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` |
| 元宝 | `yuanbao` | `YUANBAO_API_KEY` 或 `HUNYUAN_API_KEY` | `YUANBAO_MODEL`、`YUANBAO_BASE_URL` |
| Gemini | `gemini` | `GEMINI_API_KEY` 或 `GOOGLE_API_KEY` | `GEMINI_MODEL` |
| ChatGPT | `chatgpt` | `CHATGPT_API_KEY` 或 `OPENAI_API_KEY` | `CHATGPT_MODEL` |
| Claude | `claude` | `CLAUDE_API_KEY` 或 `ANTHROPIC_API_KEY` | `CLAUDE_MODEL` |
| Perplexity | `perplexity` | `PERPLEXITY_API_KEY` | `PERPLEXITY_MODEL` |
| OpenAI 代理 | `openai-proxy` | `OPENAI_API_KEY` | `ENGINE_MODE` |

完整说明见 `geo-studio/docs/CONNECTORS.md`。

### 控制台开通地址（人工）

- 豆包：https://console.volcengine.com/ark
- Kimi：https://platform.moonshot.cn
- DeepSeek：https://platform.deepseek.com
- 元宝/混元：https://console.cloud.tencent.com/hunyuan（或 TokenHub）
- Gemini：https://aistudio.google.com/apikey
- OpenAI：https://platform.openai.com
- Anthropic：https://console.anthropic.com
- Perplexity：https://www.perplexity.ai/settings/api

---

## 验证引擎可访问

### 方式 1：API 列出引擎

```powershell
curl -H "X-Api-Key: dev-key" http://localhost:3000/engines
```

应返回 9 个引擎的 `id`、`name`、`modes`、`envKeys`。

### 方式 2：单题试跑（需先建品牌）

```powershell
# 创建品牌
curl -X POST http://localhost:3000/brands `
  -H "Content-Type: application/json" `
  -H "X-Api-Key: dev-key" `
  -d '{"name":"Skillver","category":"AI求职助手"}'

# 记下返回的 id，替换 <brandId>
curl -X POST "http://localhost:3000/brands/<brandId>/engine-tests" `
  -H "Content-Type: application/json" `
  -H "X-Api-Key: dev-key" `
  -d '{"question":"Skillver 是什么？","engineId":"kimi"}'
```

返回 `202` + `jobId` 表示任务已入队；在看板「引擎试跑」或 `GET /jobs/<jobId>` 查看结果。

### 方式 3：看板 UI

1. 打开 http://localhost:5173 并登录
2. 创建 / 选择品牌 → 「引擎试跑」
3. 选择引擎（doubao / kimi / …）输入问题 → 运行

---

## 常见问题

**Docker 连不上**  
启动 Docker Desktop，等待托盘图标就绪后再执行 `docker compose up -d`。

**端口冲突**  
- PostgreSQL：5433（geo-studio）vs 5434（skillver_v1）— 互不冲突  
- Redis：6379（geo-studio）— 若被占用，改 `docker-compose.yml` 映射或停掉冲突服务

**引擎返回 stub 回答**  
正常：未配置 Key 或 `ENGINE_MODE=stub`。填入 Key 并设 `live` 后重启 backend。

**`.env` 不要提交 git**  
已在 `.gitignore` 中；Key 只放本地 `backend/.env`。

---

## 与 skillver-geo 总方案的关系

- 本指南只管 **GEO Studio 工具链**本地运行
- 内容策略 / 排期见 `skillver-geo/README.md`
- skillver 主站 GEO 技术实现仍在 `skillver_v1` 仓库，与本环境独立
