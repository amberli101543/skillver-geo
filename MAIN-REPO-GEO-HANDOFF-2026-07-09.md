# 主站仓 GEO 执行指令 · 2026-07-09

> 执行边界：本文件只给 `skillver_v1` 团队操作指令，不直接修改主站仓。
> 事实口径：Skillver 已全面开放注册；邀请码仅用于赛事参与；费用边界以主站受保护 SSOT 为准。

## 0. 执行回传 · 2026-07-10

- 开发任务 `GEO-MAIN-2026-07-P0` 已完成并推送至 `origin/main`。
- Commit：`ca69dc9a`（`fix(geo): GEO-MAIN-2026-07-P0 sitemap 守护与 FAQ 事实纠偏`）。
- 已完成：`siteUrl.ts` 非法 URL 回退与去尾斜杠、sitemap 正/边界/反例测试、三域 sitemap 重试冒烟、五组 FAQ 稳定锚点及内链、费用/导师/彩排/offer 事实漂移清理、文案守护测试。
- 本地相关套件 `55/55` 通过，无新增 lint 错误；提交仅包含 16 个 GEO 文件。
- 未完成：ECS 部署及生产版本确认、间歇 500 原始日志与根因、三域连续三次生产冒烟、Rich Results、三大站长平台、WAF/ECS 签字与首份爬虫周报。
- 本文第 3–4 节代码任务可视为已执行；第 2、5–7 节生产取证和运营验收继续有效。
- **skillver-geo 侧**：已固定 `ca69dc9a` 上游快照（`upstream/skillver_v1/`），本目录可独立推进内容/handoff；tcodeai 第三仓仍 `repositoryStatus: unresolved`。

## 1. 当前生产证据

- `https://www.skillver.cn/sitemap.xml`：存在间歇性故障；曾于 `2026-07-10 02:37:29 UTC` 返回 HTTP 200、有效 XML 且 `x-nextjs-cache: HIT`，随后外部复测再次返回 HTTP 500。
- `https://www.skillver.ai/sitemap.xml`：外部复测返回 HTTP 500。
- `https://www.tcodeai.com/sitemap.xml`：外部复测返回 HTTP 500。
- `https://www.skillver.cn/llms.txt`：HTTP 200，封闭内测口径正确。
- `https://www.tcodeai.com/llms.txt`：HTTP 200，但仍含 `open registration for talent`、固定次数和“导师咨询免费”等冲突声明。
- `https://www.tcodeai.com/`：仍有“免费注册”“注册即可免费使用”“导师一对一免费”等公开版口径，同时又写“持有邀请码”，页面内部自相矛盾。
- `https://www.skillver.cn/beta` 与 `/faq`：封闭内测口径正确；但彩排次数等具体数字与 GEO 内容事实源存在漂移，修订前必须回到主站代码/受保护 SSOT 核验。

## 2. P0：先取证，再判断是否需要改代码

在生产 ECS 执行，先保存原始证据：

```bash
cd /opt/skillver
docker compose ps
docker compose config --services
docker compose logs --since "2026-07-10T02:35:00Z" --until "2026-07-10T02:55:00Z" --timestamps \
  | tee /tmp/geo-sitemap-all-services-20260709.log
curl -i https://www.skillver.cn/sitemap.xml
curl -i https://www.skillver.ai/sitemap.xml
curl -i https://www.tcodeai.com/sitemap.xml
```

重点核对：

1. 先从 `docker compose config --services` 确定 Web 服务名，再执行 `docker compose logs --tail 200 <web-service>` 与 `docker compose exec <web-service> printenv NEXT_PUBLIC_SITE_URL`。
2. 关联同一时段 Nginx access/error 日志中的 upstream 状态、目标副本和超时；逐副本请求 `/sitemap.xml`。HTTP 200 与 500 交替出现时，优先排查边缘节点、反向代理或副本版本不一致，不得直接宣称是代码根因。
3. 日志中 `/sitemap.xml` 请求对应的 Next.js 异常堆栈，不按症状盲目重启。
4. 容器实际 `NEXT_PUBLIC_SITE_URL` 是否为空或为合法绝对 URL；生产 canonical 仍须指向 `https://www.skillver.cn`。
5. 当前部署镜像是否包含 `web/src/app/sitemap.ts`、`web/src/lib/siteUrl.ts` 的最新构建。
6. Nginx 是否把三个域的 `/sitemap.xml` 错误转发到同一个异常上游。
7. tcodeai.com 若为静态站，确认是否真的生成并部署了 sitemap 文件；不要把 Skillver 产品 sitemap 复制成内容站 sitemap。

## 3. 任何修复前先补运行级评测

现有测试只静态扫描源码，不能发现生产 500。先新增运行级测试：

1. 正例：调用 sitemap 默认导出，返回 10 条合法 `https://www.skillver.cn/...` URL。
2. 边界：`NEXT_PUBLIC_SITE_URL` 带尾斜杠时不产生双斜杠。
3. 反例：非法 `NEXT_PUBLIC_SITE_URL` 必须回退到 canonical 默认域，或在构建期明确失败，不能部署后返回 500。
4. 部署冒烟新增 sitemap 检查：三域分别要求 HTTP 200、XML 非空；`.cn/.ai` 产品域 URL 必须 canonical 到 `.cn`，tcodeai 内容站使用自己的 URL 集。

建议先跑：

```bash
cd web
npm run test -- tests/app/sitemap.test.ts tests/app/geo/geoPages.test.ts
npm run typecheck
npm run build
```

仅在日志确认代码或配置需要修改后实施修复；部署后：

```bash
docker compose up -d
bash scripts/geo/post_deploy_smoke.sh \
  https://www.skillver.cn \
  https://www.skillver.ai \
  https://www.tcodeai.com
curl -fsSL https://www.skillver.cn/sitemap.xml | xmllint --noout -
curl -fsSL https://www.skillver.ai/sitemap.xml | xmllint --noout -
curl -fsSL https://www.tcodeai.com/sitemap.xml | xmllint --noout -
```

## 4. P0：收敛三域口径

主站团队逐项修改并回归：

- tcodeai 首页删除“邀请码准入”“需邀请码才能注册”等旧表达，改为“全面开放注册；邀请码仅用于赛事参与”。
- tcodeai `llms.txt` 删除 `open registration for talent`。
- 具体彩排/正式面试次数只保留主站受保护 SSOT 已确认值；在冲突未解决前改为“有内测配额”。
- 导师统一标注“待开通”，不得声称当前可免费预约。
- 不承诺拿到 offer；“陪你拿下/拿到 offer”改为“帮助准备并对接机会”等非结果承诺。
- 三域产品入口关系保持：`.cn` canonical 主入口、`.ai` 并行入口、tcodeai 内容站。

部署后执行冲突词扫描：

```bash
for base in https://www.skillver.cn https://www.skillver.ai https://www.tcodeai.com; do
  for path in / /faq /beta /help/glossary /llms.txt; do
    curl -fsSL "$base$path" 2>/dev/null |
      grep -Ei '开放注册|公开版|免费注册|open registration|保证.*offer|拿下.*offer' &&
      echo "CONFLICT $base$path"
  done
done
```

预期：无冲突命中。若合规页因历史引用命中，必须人工判断，不得直接批量替换法律文本。

## 5. P1：sitemap 恢复后再做外部提交

人工登录并归档截图：

1. 百度搜索资源平台：提交 `https://www.skillver.cn/sitemap.xml` 与 tcodeai 自有 sitemap。
2. Bing Webmaster Tools：提交上述两个站点。
3. Google Search Console：提交上述两个站点。
4. 不把 `.ai` 当独立 canonical 站重复提交。
5. 记录提交时间、抓取状态、错误信息和截图路径；不得只勾选“已提交”。

## 6. P1：WAF/ECS 与首份爬虫周报

```bash
bash scripts/geo/verify_crawler_access.sh \
  https://www.skillver.cn \
  https://www.tcodeai.com

python scripts/geo/analyze_ai_crawler_logs.py \
  --days 7 \
  /var/log/nginx/access.log \
  > /tmp/geo-crawler-weekly-20260709.md
```

验收：

- GPTBot、OAI-SearchBot、ClaudeBot、PerplexityBot、Bytespider、Baiduspider、bingbot 的关键公开页请求可返回 200。
- WAF/安全组无 UA 黑名单；如需修改配置，修改后必须 `docker compose up -d` 并同步入库。
- 周报保留请求量、Top 路径、状态码分布；没有请求也要如实记录为零，不得伪造抓取。

## 7. 主站团队回传物

- sitemap 500 原始异常堆栈与根因。
- 修复 commit/PR、测试输出和部署版本。
- 三域冒烟输出。
- 三个站长平台提交截图与状态。
- WAF/ECS 签字。
- 首份 AI 爬虫周报。
- 三域口径冲突扫描结果。
