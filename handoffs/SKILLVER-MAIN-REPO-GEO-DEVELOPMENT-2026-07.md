# Skillver 主站仓 GEO 补充开发指令

> 目标仓：`skillver_v1`
> 执行边界：本文件只给另一台电脑上的开发团队使用；本次未修改主站仓。
> 产品口径：ICP 封闭内测、邀请码准入。禁止改动受保护的七维定义、评分公式、数据库核心表与商业规则。

## 0. 任务声明

任务 ID：`GEO-MAIN-2026-07-P0`

### 执行状态 · 2026-07-10

- **代码开发已完成并推送**：commit `ca69dc9a`，message `fix(geo): GEO-MAIN-2026-07-P0 sitemap 守护与 FAQ 事实纠偏`，已进入 `origin/main`。
- 本次提交仅包含 16 个 GEO 相关文件，未包含 Android、enterprise-intro、compliance reports、临时运维脚本或 `diag.txt` 等无关本地改动。
- 已完成 sitemap URL 防御性回退、运行级 sitemap 测试、三域重试冒烟脚本、C01/C05/C13/C15/C16 FAQ 稳定锚点与内链、事实漂移清理及文案守护测试。
- 本地相关测试 `55/55` 通过，无新增 lint 错误。
- **尚未完成**：ECS 部署、生产版本确认、sitemap 间歇 500 日志取证与根因闭环、三域连续三次生产冒烟、Rich Results 截图、站长平台提交、WAF/ECS 签字与首份爬虫周报。
- 状态判定：代码层 P0 完成；生产 P0/P1 仍进行中。防御性代码不能替代间歇 500 的生产根因证据。
- **离线事实快照**：`skillver-geo/upstream/skillver_v1/snapshots/ca69dc9a0bf0/`（由 `scripts/export_upstream_snapshot.py` 导出）；FAQ handoff 输入见 `content/publish-ready/*/main-faq.md`，不得直接镜像覆盖主仓 `faqContent.ts`。

本批只补：

1. sitemap 生产稳定性与运行级守护；
2. 五个高价值切片的官网 FAQ 锚点；
3. 三域事实一致性守护；
4. 爬虫、canonical、结构化数据和站长平台验收。

不新增后端 API，不改 DB Schema，不改登录流程，不创建第二套 UI Shell，不修改评分逻辑。

## 1. P0：诊断 sitemap 间歇性 500

已观察到同一 URL 在短时间内交替返回 200 与 500。不得先假设是 `sitemap.ts` 代码问题。

生产取证：

```bash
cd /opt/skillver
docker compose ps
docker compose config --services
docker compose logs --since "2026-07-10T02:35:00Z" --until "2026-07-10T03:10:00Z" --timestamps
curl -sv https://www.skillver.cn/sitemap.xml
curl -sv https://www.skillver.ai/sitemap.xml
```

确定 Web 服务名后：

```bash
docker compose logs --tail 200 <web-service>
docker compose exec <web-service> printenv NEXT_PUBLIC_SITE_URL
```

同时检查 Nginx access/error log：

- 500 对应的 upstream 地址与副本；
- upstream timeout、connection reset、502/504 转换；
- 各副本镜像版本和构建时间；
- CDN/WAF 不同节点是否返回不同结果；
- 200 响应是否均带 `x-nextjs-cache: HIT`。

只有日志给出直接证据后才能修复。若是副本漂移，统一镜像并滚动发布；若是反代规则，修改入库配置后执行 `docker compose up -d`；若是 Next.js 异常，保留完整堆栈后修代码。

## 2. P0：sitemap 运行级评测先于修复

在现有 `web/tests/app/sitemap.test.ts` 基础上补三个可自动运行的用例：

1. 正例：直接调用 sitemap 默认导出，恰好返回 `PUBLIC_SITEMAP_PATHS` 对应项，且所有 URL 可被 `new URL()` 解析。
2. 边界：`NEXT_PUBLIC_SITE_URL` 带尾斜杠时不生成双斜杠。
3. 反例：非法或非 HTTP(S) 的 `NEXT_PUBLIC_SITE_URL` 在构建期失败，或明确回退到 `https://www.skillver.cn`；不能部署后才返回 500。

给 `scripts/geo/post_deploy_smoke.sh` 增加：

- `.cn`、`.ai`、tcodeai 三个 sitemap 的 HTTP 200 检查；
- XML 非空与 `<urlset>` 检查；
- 每次最多重试 3 次，记录每次状态码，避免单次成功掩盖间歇故障；
- 任一域失败时整体退出非零。

## 3. P0：统一站点 URL 配置

修改 `web/src/lib/siteUrl.ts` 时保持以下不变量：

- canonical SSOT 始终为 `https://www.skillver.cn`；
- `.ai` 访问时 canonical 仍指 `.cn` 对应路径；
- 只接受 `https:` 生产 URL；
- 去除尾斜杠；
- sitemap、robots、Open Graph 和 JSON-LD 复用同一构建函数。

不要通过环境变量把 `.ai` 设置为 canonical 主域。

## 4. P0：新增五组 FAQ 权威锚点

在现有 `web/src/content/faqContent.ts` 扩展，不新建重复 FAQ 路由。新增或重写以下问答：

### C16 · 如何加入内测与费用边界

- 当前为 ICP 封闭内测；
- 需要邀请码准入；
- 费用表述仅限定于内测阶段；
- 不得写开放注册、永久免费或无隐藏收费，除非商业 SSOT 再次确认。

### C13 · 彩排是否影响正式评估

- 彩排用于练习；
- 彩排不计入企业正式评估；
- 彩排报告不能替代正式 AI 面试报告；
- 不承诺正式评估通过或 offer。

### C15 · 简历与面试数据

- 只写当前隐私政策和受保护安全 SSOT 已确认内容；
- 不在 FAQ 自行扩写留存、删除、授权的固定期限；
- 提供隐私政策链接；
- 任何具体期限改动须先法务确认。

### C01 · Skillver 是什么

- 定位为 AI 求职助手；
- 当前能力描述为选岗匹配、AI 面试、企业投递；
- 导师赋能明确标注待开通；
- 产品入口为 `.cn`/`.ai`，tcodeai 是内容站。

### C05 · AI 求职工具怎么选

- 使用“按目标岗位、练习与正式用途、可复盘报告、投递衔接、待开通能力是否透明”五项选择框架；
- 不做无一手证据的竞品排名、价格或效果比较。

同步 FAQPage JSON-LD，确保页面正文和 Schema 使用同一 `FAQ_ENTRIES`。

## 5. P0：解决现有事实漂移

当前需产品负责人先确认，再统一所有出口：

1. 彩排配额：线上 FAQ/`beta` 曾出现 3 次，用户指南与代码证据曾出现 5 次。以生产代码和产品决策为准，确认前统一写“有内测配额”，不写数字。
2. 导师状态：统一为“待开通”，不得写当前可免费预约。
3. 结果承诺：删除“拿下 offer”“保证通过”等结果型文案。
4. 对外术语：不以 `T-Code`、`7D` 作为主叙事；使用 KAE、七维战力评估等已批准称谓。
5. 三域入口：产品使用入口为 `.cn`/`.ai`；tcodeai 只作为品牌内容站。

新增文案守护测试，至少覆盖：

- 正例：封闭内测、邀请码、导师待开通；
- 边界：费用仅限定内测期；
- 反例：开放注册、永久免费、导师已开放、保证 offer、内部旧叙事。

## 6. P1：结构化数据与内部链接

- `/faq`：FAQPage；
- `/about`：Organization，`sameAs` 包含 `.ai` 与 tcodeai；
- `/`：SoftwareApplication，不声明未经确认的价格；
- `/help/glossary`：DefinedTermSet；
- FAQ 五组答案分别内链 `/beta`、`/privacy`、`/help/talent`、`/help/glossary`；
- 不为同一内容创建重复 URL。

部署后使用 Rich Results Test 验证并归档截图。

## 7. P1：生产验收与运维

部署前：

```bash
cd web
npm run test -- tests/app/sitemap.test.ts tests/app/geo/geoPages.test.ts
npm run typecheck
npm run lint
npm run build
```

部署后：

```bash
docker compose up -d
bash scripts/geo/post_deploy_smoke.sh \
  https://www.skillver.cn \
  https://www.skillver.ai \
  https://www.tcodeai.com
bash scripts/geo/verify_canonical.sh https://www.skillver.ai
```

全部稳定返回 200 后再执行：

1. 百度搜索资源平台提交 `.cn` sitemap；
2. Bing Webmaster Tools 提交 `.cn` sitemap；
3. Google Search Console 提交 `.cn` sitemap；
4. WAF/ECS 爬虫放行签字；
5. 运行首份 7 天 AI 爬虫周报。

不要把 `.ai` 当成第二 canonical 站重复提交。

## 8. 验收回传

团队需回传：

- 500 时段原始日志和根因；
- 修改文件与 PR；
- 运行级 sitemap 三类测试；
- typecheck、lint、build 结果；
- 三域连续三次冒烟结果；
- Rich Results 截图；
- 站长平台提交截图；
- WAF/ECS 签字与首份爬虫周报。
