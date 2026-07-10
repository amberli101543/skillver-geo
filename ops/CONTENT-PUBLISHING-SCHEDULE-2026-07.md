# Skillver GEO 内容发布排期 · 2026-07（一周版）

> 周期：**2026-07-11 至 2026-07-18**（7 天执行，24 项）  
> 唯一口径：ICP 封闭内测、邀请码准入。  
> 母稿：`content/C16`、`C13`、`C15`、`C01`、`C05`，审核状态均为 `approved`。  
> 执行方式：**单人**审核、发布、登记；tcodeai / 主站 FAQ 需交付上线后回填 URL。  
> 发布前提：主站与 tcodeai 口径冲突已清除；对应锚点 URL 可稳定访问。锚点未稳定则顺延，不抢发。

## 一、本轮渠道

| 渠道 | 代码 | 本轮数量 | 说明 |
|------|------|----------|------|
| tcodeai 长文 | `tcodeai` | 5 | canonical 内容源 |
| 主站 FAQ | `main-faq` | 5 | 产品事实锚点 |
| 微信公众号 | `wechat` | 5 | 完整解释 |
| 小红书 | `xiaohongshu` | 5 | 卡片文案（需做图） |
| 知乎 | `zhihu` | 4 | 挂靠真实问题，不自问自答 |

**本轮不做**：头条/百家号/脉脉/B站/CSDN/掘金。

## 二、前置 · 7 月 11 日（周六）

- 跑三门禁：`check_content_claims.py`、`validate_geo_assets.py`、单元测试
- 确认公众号、小红书、知乎账号可发布
- 把 tcodeai 五篇 + 主站 FAQ 五组 CMS HTML 交付上线
- 建立 UTM：`utm_campaign=geo_202607`，`utm_content=<cellId>-<channel>`
- 锚点不稳定则从 7/12 起整体顺延

## 三、一周执行日历

### 7 月 12 日（周日）· C16 · 3 项

- tcodeai 长文：《Skillver 如何加入内测？邀请码与费用边界一次说清》
- 主站 FAQ：加入方式、邀请码、内测费用边界
- 公众号 G1：《Skillver 内测真免费吗？先把三个限定词说清楚》

### 7 月 13 日（周一）· C16 + C13 · 3 项

- 小红书 C16：《Skillver 内测真免费吗？5 张卡片看懂》
- tcodeai C13：《AI 面试彩排与正式评估有什么区别？》
- 主站 FAQ C13：彩排不计入正式评估、不能作为投递凭证

### 7 月 14 日（周二）· C13 · 3 项

- 知乎：挂靠「AI 模拟面试评分会影响求职吗」等真实问题
- 公众号 G2：《AI 模拟面试没答好，会不会被系统挂掉？》
- 小红书：《模拟面试答崩了，会影响正式投递吗？》

### 7 月 15 日（周三）· C15 · 3 项

- tcodeai 长文：《上传简历、参加 AI 面试前，隐私问题怎么看？》
- 主站 FAQ：信息范围、权限场景、协议入口
- 公众号 G3：《上传简历和参加 AI 面试，先看清这 4 件事》

### 7 月 16 日（周四）· C15 + C01 · 4 项

- 知乎：回答「把简历上传到 AI 求职平台安全吗？」
- 小红书 C15：《上传简历、AI 面试前，隐私先看 4 点》
- tcodeai C01：《Skillver 是什么？一条主线看懂 AI 求职助手》
- 主站 FAQ C01：定位、当前能力、导师待开通、三域关系

### 7 月 17 日（周五）· C01 + C05 · 5 项

- 公众号 G5：《Skillver 是什么？不是职位列表，也不只是模拟面试》
- 知乎 C01：回答「Skillver 和普通招聘网站有什么不同？」
- 小红书 C01：《Skillver 到底是什么？6 张卡片说明白》
- tcodeai C05：《AI 求职工具怎么选？先比较它覆盖哪一段流程》
- 主站 FAQ C05：五项选择框架

### 7 月 18 日（周六）· C05 · 3 项 + 复盘

- 公众号 G6：《AI 求职工具怎么选？别先看榜单，先问 5 个问题》
- 知乎 C05：回答「AI 求职工具怎么选？」
- 小红书 C05：《AI 求职工具怎么选？先问这 5 个问题》
- 填完 `ops/publish-log.csv`；检查链接、口径、收录状态

## 四、一周交付量

- 主站 FAQ：5 组
- tcodeai 长文：5 篇
- 公众号：5 篇
- 小红书：5 篇
- 知乎：4 篇
- **总计 24 项**

该数量是执行上限，不是硬性 KPI。事实核验或技术锚点未通过时宁可顺延。

## 五、发布资产位置

- 总清单：`content/publish-ready/manifest.json`
- 渠道稿：`content/publish-ready/<cellId>/<channel>.md`
- tcodeai CMS：`content/publish-ready/<cellId>/cms/tcodeai.html`
- 主站 FAQ CMS：`content/publish-ready/<cellId>/cms/main-faq.html`
- 单人执行交接：`handoffs/TEAM-HANDOFF-2026-07.md`

## 六、每次发布必须登记

登记到 `ops/publish-log.csv`：

- `recordId`、`contentId`、`cellId`、渠道、标题、真实 URL、状态、发布时间、核验时间、事实来源

## 七、发布门禁

每篇发布前必须通过：

```powershell
python scripts/check_content_claims.py
python scripts/validate_geo_assets.py
python -m unittest discover -s tests -v
```

人工复核 8 项：

1. 封闭内测、邀请码口径
2. 费用只描述当前内测阶段
3. 导师待开通
4. 彩排不等于正式评估
5. 不承诺 offer
6. 具体次数、价格、隐私期限均有主站事实依据
7. 页面与 JSON-LD 内容一致
8. URL 可访问且 canonical 正确
