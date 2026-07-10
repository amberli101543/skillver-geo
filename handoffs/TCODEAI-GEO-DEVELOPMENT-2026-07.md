# tcodeai.com GEO 补充开发指令

> 目标：把 tcodeai.com 建成 Skillver 的品牌内容站与外部引用源。
> 边界：产品注册、登录和使用入口始终指向 `www.skillver.cn` / `www.skillver.ai`；tcodeai.com 不冒充产品应用。
> 前置：先定位 tcodeai/cpweb 的真实仓库、部署流水线和路由 SSOT。当前两个已知工作区中没有该代码，禁止继续用不可验真的 `[x]` 状态代替代码证据。

## 0. 任务声明

任务 ID：`GEO-TCODEAI-2026-07-P0`

本批只做：

1. 生产口径纠偏；
2. sitemap、robots、canonical、llms.txt 与 JSON-LD；
3. 五个 GEO 长文引用页面；
4. 产品双域的显著互链；
5. 可自动运行的 GEO 验收。

不修改 Skillver 产品 API，不复制主站登录功能，不新建重复 UI Shell。

## 1. P0：先修生产口径

首页、FAQ、产品页、`llms.txt` 全量删除或改写：

- “免费注册”“开放注册”“open registration”；
- “当前版本永久免费”；
- “导师当前可免费预约”；
- 固定彩排/正式面试次数；
- “拿下 offer”“保证 offer”等结果承诺。

统一为：

- 当前处于 ICP 封闭内测；
- 需要邀请码准入；
- 内测费用边界以 Skillver 主站 `/beta` 与 `/faq` 为准；
- 导师赋能待开通；
- 产品使用入口为 `www.skillver.cn` 与 `www.skillver.ai`；
- tcodeai.com 是品牌、研究和 GEO 内容站。

保留“费用”主题时必须写清阶段限定，不能把当前阶段外推为长期价格承诺。

## 2. P0：修复 sitemap

当前外部请求曾返回 HTTP 500。先确认站点类型：

- 静态站：构建时生成真实 `sitemap.xml`；
- SSR/框架站：使用框架 metadata route，并增加运行级测试；
- 多域反代：确认 `/sitemap.xml` 没有被错误转发到 Skillver 产品站上游。

tcodeai sitemap 只收录自身 canonical 内容：

- `/`
- `/faq.html` 或真实 FAQ canonical 路径；
- `/company/`
- `/product/`
- `/protocol/`
- `/solutions/`
- `/research/`
- 两份白皮书实际 URL；
- 本批新增的五篇内容 URL。

不得复制 Skillver 产品站 sitemap，也不得收录注册、登录 URL。

验收：

```bash
curl -fsSL https://www.tcodeai.com/sitemap.xml | xmllint --noout -
curl -fsSL https://www.tcodeai.com/robots.txt
```

## 3. P0：canonical 与三域关系

- tcodeai 自有内容 canonical 指向同一 tcodeai URL；
- 页面显著位置展示“使用 Skillver：`www.skillver.cn` / `www.skillver.ai`”；
- Organization 或 WebSite JSON-LD 的 `sameAs` 指向 Skillver 双域；
- 不把所有 tcodeai 内容 canonical 到 skillver.cn，否则内容站无法独立积累引用信号；
- 所有产品 CTA 使用双域入口，不使用 tcodeai 作为注册入口。

## 4. P0：重写 llms.txt

`llms.txt` 必须包含：

1. Skillver 的准确定位；
2. 封闭内测、邀请码准入；
3. 产品双域与内容站角色；
4. 已上线能力与导师待开通；
5. 关键研究、FAQ、产品说明和五篇内容 URL；
6. 公司主体与公开联系方式。

禁止包含：

- open registration；
- 未核实次数、价格、企业数量或效果数据；
- 导师已开放；
- offer 保证。

给 `llms.txt` 与 sitemap 增加一致性检查：关键内容路径必须同时出现在二者中。

## 5. P0：新增五个可引用长文页

优先复用现有内容详情模板与路由，不创建第二套导航或页面壳。

建议 canonical 路径：

- `/insights/skillver-closed-beta-guide/` — C16
- `/insights/interview-rehearsal-vs-formal-assessment/` — C13
- `/insights/resume-interview-data-privacy/` — C15
- `/insights/what-is-skillver/` — C01
- `/insights/how-to-choose-ai-job-search-tools/` — C05

若仓库已有 `/research/` 或 `/articles/` 内容模型，应放入既有路由，不机械新增 `/insights/`。

每页必须具备：

- 唯一 H1；
- 120–160 字摘要；
- 作者/审核主体；
- `datePublished`、`dateModified`；
- 事实来源与更新时间；
- 指向 Skillver `/faq`、`/beta`、`/privacy` 等相关页面；
- Product CTA 指向 `.cn`/`.ai`；
- Article 或 BlogPosting JSON-LD；
- BreadcrumbList；
- 分享图与可读正文；
- 不依赖客户端脚本才能看到主正文。

文案源使用 `skillver-geo/content/` 的 C16、C13、C15、C01、C05，发布前按主站最新事实再复核。

## 6. P1：研究与白皮书引用资产

将现有两份白皮书转为可索引 HTML：

- 2026 AI 行业人才白皮书；
- 2026 机器人与具身智能行业人才白皮书。

最低要求：

- 摘要、目录、方法说明、发布日期、版本号；
- 图表必须有数据来源和统计口径；
- 完整正文或可读核心章节，不能只有下载按钮；
- Report/Article JSON-LD；
- 每一章具有稳定锚点；
- PDF 如存在，应 canonical 到 HTML 主页面或明确二者关系；
- 不发布无法证明的市场规模、排名、通过率和企业采用量。

## 7. P1：内容发现与订阅

在已有架构允许时补：

- 内容索引页；
- RSS/Atom；
- 每篇文章的相关文章内链；
- 首页与研究页到五篇长文的入口；
- Open Graph 与 Twitter Card；
- `lastmod` 随真实内容变更更新，不在每次请求伪造当前时间。

不要为 GEO 隐藏堆词，不生成只给爬虫看的正文。

## 8. 自动化门禁

先写以下测试，再实现：

1. 正例：五篇文章均出现在 sitemap 和 llms.txt；
2. 边界：尾斜杠 canonical 唯一、无重复 URL；
3. 反例：构建产物不得命中开放注册、永久免费、导师已开放、保证 offer；
4. JSON-LD 可 `JSON.parse`，Article 的 `headline`、`datePublished`、`mainEntityOfPage` 完整；
5. 所有产品 CTA 指向 skillver 双域；
6. sitemap、robots、首页、五篇文章连续请求返回 200。

部署后连续三次执行，间隔 30 秒：

```bash
curl -fsS -o /dev/null -w "%{http_code}\n" https://www.tcodeai.com/
curl -fsS -o /dev/null -w "%{http_code}\n" https://www.tcodeai.com/sitemap.xml
curl -fsS https://www.tcodeai.com/llms.txt
```

## 9. 站长平台与监测

sitemap 稳定后分别提交 tcodeai.com：

- 百度搜索资源平台；
- Bing Webmaster Tools；
- Google Search Console。

记录提交时间、抓取结果、发现 URL 数、索引 URL 数和错误截图。tcodeai 与 skillver.cn 独立提交，不混写 sitemap。

## 10. 验收回传

- 真实仓库与部署路径；
- 口径扫描结果；
- sitemap/robots/llms/canonical 测试；
- 五篇文章 URL；
- JSON-LD 校验截图；
- 三平台 sitemap 提交证据；
- 部署版本与回滚方式。
