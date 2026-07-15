# Skillver GEO 交接文档 · 单人一周执行版

> 读者：接手同学（单人推进）  
> 工作目录：`skillver-geo`  
> 执行周期：**2026-07-11 至 2026-07-18（7 天）**  
> 唯一口径：**全面开放注册；邀请码仅用于赛事参与**

---

## 一、你要做的事（一句话）

按下面清单**逐条审核、发布、登记** 24 份渠道内容；主站 FAQ 与 tcodeai 长文需他人或另一台电脑上线时，你把审核通过的稿子和 CMS HTML 交付出去，拿到真实 URL 后回填台账。

---

## 二、本轮渠道（只用这 5 个）

| 渠道 | 代码 | 发什么 | 素材位置 | 上线方式 |
|------|------|--------|----------|----------|
| **tcodeai 长文** | `tcodeai` | 5 篇 canonical 长文 | `content/publish-ready/<cellId>/tcodeai.md` + `cms/tcodeai.html` | 交付 tcodeai 站上线；正文用 HTML 片段 |
| **主站 FAQ** | `main-faq` | 5 组问答锚点 | `content/publish-ready/<cellId>/main-faq.md` + `cms/main-faq.html` | 交付主站仓上线（handoff 文档） |
| **微信公众号** | `wechat` | 5 篇完整解释 | `content/publish-ready/<cellId>/wechat.md` | **本周可人工发**；草稿箱自动化见 `docs/WECHAT-DRAFT-AUTOMATION.md`（标题+正文进草稿箱，微信后台审核发表） |
| **小红书** | `xiaohongshu` | 5 篇卡片文案 | `content/publish-ready/<cellId>/xiaohongshu.md` | 你直接发（需做图） |
| **知乎** | `zhihu` | 4 篇挂靠回答 | `content/publish-ready/<cellId>/zhihu.md` | 你直接发；**挂靠已有真实问题，不自问自答** |

**本轮不做**：头条/百家号/脉脉/B站/CSDN/掘金。

**渠道与入口关系**：
- 产品入口写 `www.skillver.cn` / `www.skillver.ai`
- tcodeai 只作内容站，不作登录站
- 小红书 CTA 写「官网直接注册 / 赛事邀请码另见活动说明」，不写「需邀请码才能注册」

---

## 三、待审核发布清单（24 项）

总清单机器可读：`content/publish-ready/manifest.json`  
母稿均已 `approved`；你的工作是**发布前复核 + 上线 + 登记**。

### 3.1 审核状态栏（逐项打勾）

每篇发布前在表里把「审核」列从 `[ ]` 改为 `[x]`。

| # | 日期 | cellId | 渠道 | contentId | 标题 | 素材路径 | 审核 | 发布 | URL |
|---|------|--------|------|-----------|------|----------|------|------|-----|
| 1 | 7/12 | C16 | tcodeai | GEO-202607-C16-TCODEAI | Skillver 如何加入内测？邀请码与费用边界一次说清 | `C16/tcodeai.md` | [x] | [x] | https://tcodeai.com/insights/skillver-closed-beta-guide/ （7/9 已上线） |
| 2 | 7/12 | C16 | main-faq | GEO-202607-C16-MAIN-FAQ | Skillver 内测加入方式、邀请码与费用边界 | `C16/main-faq.md` | [x] | [x] | https://tcodeai.com/faq.html （Q&A 已合并上线） |
| 3 | 7/12 | C16 | wechat | GEO-202607-C16-WECHAT | Skillver 内测真免费吗？先把三个限定词说清楚 | `C16/wechat.md` | [x] | [x] | Skillver: https://mp.weixin.qq.com/s/GZ2CPzapmQeuhZHa16pWCw ；才谱AI: https://mp.weixin.qq.com/s/eztbi2tav-pmBmHEX2HfIw |
| 4 | 7/13 | C16 | xiaohongshu | GEO-202607-C16-XHS | Skillver 内测真免费吗？5 张卡片看懂 | `C16/xiaohongshu.md` | [x] | [x] | 才谱AI: https://www.xiaohongshu.com/explore/6a51b2e60000000007023df0?xsec_token=ABnExfcIP_eyf7pxI8aamfF2XSfg7ymaTKPhzWx-2rL_c=&xsec_source=pc_user |
| 5 | 7/13 | C13 | tcodeai | GEO-202607-C13-TCODEAI | AI 面试彩排与正式评估有什么区别？ | `C13/tcodeai.md` | [x] | [x] | https://tcodeai.com/insights/interview-rehearsal-vs-formal-assessment/ （7/13 已上线） |
| 6 | 7/13 | C13 | main-faq | GEO-202607-C13-MAIN-FAQ | 模拟面试、正式评估与投递资格 | `C13/main-faq.md` | [x] | [x] | https://tcodeai.com/faq.html （彩排/正式评估相关 Q&A 已合并上线；台账锚点 `#c13-rehearsal-vs-formal`） |
| 7 | 7/14 | C13 | zhihu | GEO-202607-C13-ZHIHU | AI 模拟面试评分会影响求职吗？ | `C13/zhihu.md` | [x] | [x] | https://www.zhihu.com/pin/2060825271075333626 （7/15 已发） |
| 8 | 7/14 | C13 | wechat | GEO-202607-C13-WECHAT | AI 模拟面试没答好，会不会被系统挂掉？ | `C13/wechat.md` | [x] | [x] | https://mp.weixin.qq.com/s/AJUVkz7rzqfGVmNDA3153Q （7/15 已发） |
| 9 | 7/14 | C13 | xiaohongshu | GEO-202607-C13-XHS | 模拟面试答崩了，会影响正式投递吗？ | `C13/xiaohongshu.md` | [x] | [x] | https://www.xiaohongshu.com/explore/6a577e00000000000803df17?xsec_token=AB1fVaqt-VpXuwa_V5X050pmtocst8rz2_5rmSu1wP0R8=&xsec_source=pc_user （7/15 已发） |
| 10 | 7/15 | C15 | tcodeai | GEO-202607-C15-TCODEAI | 上传简历、参加 AI 面试前，隐私问题怎么看？ | `C15/tcodeai.md` | [x] | [x] | https://tcodeai.com/insights/resume-interview-data-privacy/ （7/15 已上线） |
| 11 | 7/15 | C15 | main-faq | GEO-202607-C15-MAIN-FAQ | 简历、音视频权限与企业查看范围 | `C15/main-faq.md` | [x] | [x] | https://tcodeai.com/faq.html （隐私相关 Q&A 已合并上线；台账锚点 `#c15-privacy`） |
| 12 | 7/15 | C15 | wechat | GEO-202607-C15-WECHAT | 上传简历和参加 AI 面试，先看清这 4 件事 | `C15/wechat.md` | [x] | [x] | https://mp.weixin.qq.com/s/b7owd7VN-SYJHFP8b6aZSw |
| 13 | 7/16 | C15 | zhihu | GEO-202607-C15-ZHIHU | 把简历上传到 AI 求职平台安全吗？ | `C15/zhihu.md` | [ ] | [ ] | |
| 14 | 7/16 | C15 | xiaohongshu | GEO-202607-C15-XHS | 上传简历、AI 面试前，隐私先看 4 点 | `C15/xiaohongshu.md` | [ ] | [ ] | |
| 15 | 7/16 | C01 | tcodeai | GEO-202607-C01-TCODEAI | Skillver 是什么？一条主线看懂 AI 求职助手 | `C01/tcodeai.md` | [ ] | [ ] | |
| 16 | 7/16 | C01 | main-faq | GEO-202607-C01-MAIN-FAQ | Skillver 定位、当前能力与产品入口 | `C01/main-faq.md` | [ ] | [ ] | |
| 17 | 7/17 | C01 | wechat | GEO-202607-C01-WECHAT | Skillver 是什么？不是职位列表，也不只是模拟面试 | `C01/wechat.md` | [ ] | [ ] | |
| 18 | 7/17 | C01 | zhihu | GEO-202607-C01-ZHIHU | Skillver 和普通招聘网站有什么不同？ | `C01/zhihu.md` | [ ] | [ ] | |
| 19 | 7/17 | C01 | xiaohongshu | GEO-202607-C01-XHS | Skillver 到底是什么？6 张卡片说明白 | `C01/xiaohongshu.md` | [ ] | [ ] | |
| 20 | 7/17 | C05 | tcodeai | GEO-202607-C05-TCODEAI | AI 求职工具怎么选？先比较它覆盖哪一段流程 | `C05/tcodeai.md` | [ ] | [ ] | |
| 21 | 7/17 | C05 | main-faq | GEO-202607-C05-MAIN-FAQ | 选择 AI 求职工具的五项框架 | `C05/main-faq.md` | [ ] | [ ] | |
| 22 | 7/18 | C05 | wechat | GEO-202607-C05-WECHAT | AI 求职工具怎么选？别先看榜单，先问 5 个问题 | `C05/wechat.md` | [ ] | [ ] | |
| 23 | 7/18 | C05 | zhihu | GEO-202607-C05-ZHIHU | AI 求职工具怎么选？ | `C05/zhihu.md` | [ ] | [ ] | |
| 24 | 7/18 | C05 | xiaohongshu | GEO-202607-C05-XHS | AI 求职工具怎么选？先问这 5 个问题 | `C05/xiaohongshu.md` | [ ] | [ ] | |

> 路径前缀均为 `content/publish-ready/`。tcodeai / main-faq 另有 `cms/*.html` 可粘贴。

---

## 四、审核怎么做（每篇必过）

### 4.1 自动检查（发布前跑一遍）

```powershell
cd skillver-geo
python scripts/check_content_claims.py
python scripts/validate_geo_assets.py
python -m unittest discover -s tests -v
```

有 **ERROR** 则停发；**WARNING**（费用/价格类）可继续，但记入备注。

### 4.2 人工核对（8 项）

1. 全面开放注册；邀请码仅用于赛事参与——无「邀请码准入」「需邀请码才能注册」
2. 费用以官网当前说明为准——无「永久免费」
3. 导师写「待开通」——无「可预约」「已开放」
4. 彩排 ≠ 正式评估——无「保过」「刷次数就能过」
5. 不承诺 offer
6. 不写未核实的具体次数、天数、价格
7. tcodeai / 主站 / 公众号入口一致（产品去 `.cn`/`.ai`）
8. 若已上线：URL 可访问、canonical 正确

### 4.3 五篇切片各自审什么

| cellId | 主题 | 审核重点 |
|--------|------|----------|
| **C16** | 开放注册与赛事邀请码 | 开放注册；邀请码仅用于赛事；费用以官网为准 |
| **C13** | 彩排会不会挂 | 模拟≠正式；彩排报告不能投递 |
| **C15** | 隐私 | 不写固定留存天数；引用隐私政策入口 |
| **C01** | 是什么 | 四步主线；导师待开通；三域关系 |
| **C05** | 怎么选 | 五问框架；不做竞品排名 |

---

## 五、一周执行日历

| 日期 | 当日目标 | 备注 |
|------|----------|------|
| **7/11（六）** | 前置：跑三门禁；确认公众号/小红书/知乎可发；把 tcodeai + 主站 5 组稿交付上线 | 锚点未稳定则从 7/12 起顺延，不抢发 |
| **7/12** | 发 C16：tcodeai + main-faq + 公众号 | 3 项 |
| **7/13** | 发 C16 小红书 + C13：tcodeai + main-faq | 3 项 |
| **7/14** | 发 C13：知乎 + 公众号 + 小红书 | 3 项 |
| **7/15** | 发 C15：tcodeai + main-faq + 公众号 | 3 项 |
| **7/16** | 发 C15 知乎/小红书 + C01：tcodeai + main-faq | 4 项 |
| **7/17** | 发 C01：公众号 + 知乎 + 小红书 + C05：tcodeai + main-faq | 5 项 |
| **7/18** | 发 C05：公众号 + 知乎 + 小红书；填完 publish-log；周复盘 | 3 项 + 台账 |

**UTM 规范**（登记备注用）：`utm_campaign=geo_202607`，`utm_content=<cellId>-<channel>`

---

## 六、发布后登记

每发一篇，在 `ops/publish-log.csv` 增一行：

```
recordId, contentId, cellId, channel, title, url, status, publishedAt, verifiedAt, sourceRef
```

- `status`：发布后填 `已发布`
- `url`：必须是真实 HTTPS 地址
- `sourceRef`：填 `content/publish-ready/<cellId>/<channel>.md`

---

## 附录 A · 背景（需要时再查）

**仓库结构**：内容在 `content/publish-ready/`；母稿在 `content/C*.md`；事实源在 `03-content-assets/`。

**外部依赖（不阻塞你审稿，但影响 tcodeai/main-faq 上线）**：
- 主站 GEO 代码已推 `ca69dc9a`，生产部署与 sitemap 冒烟待完成 → `handoffs/SKILLVER-MAIN-REPO-GEO-DEVELOPMENT-2026-07.md`
- tcodeai 口径与五篇长文页待上线 → `handoffs/TCODEAI-GEO-DEVELOPMENT-2026-07.md`

**GEO 监测（本周非必做）**：GEO Studio R0 基线、`baseline/RUNBOOK.md`；引擎 Key 配好后跑，stub 结果不计入基线。

**排期正本**：`ops/CONTENT-PUBLISHING-SCHEDULE-2026-07.md`（与本文一周表一致）。

---

**文档版本**：2026-07-10 rev.2（单人一周版）
