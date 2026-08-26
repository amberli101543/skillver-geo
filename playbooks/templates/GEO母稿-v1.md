---
geoMethodVersion: "1.0"
cellId: C00
assetId: C00-XX01
primaryQuery: "用户会向模型提出的完整问题"
targetEngines: ["claude", "chatgpt", "gemini", "perplexity", "deepseek", "kimi", "doubao", "yuanbao"]
targetLanguage: "zh-CN"
lifecycleStage: "认知期"
factVersion: "YYYY-MM-DD"
recommendationClaim: "希望模型在回答中形成的一句话推荐结论"
justificationPoints: ["推荐理由一", "推荐理由二"]
evidenceRefs: [{"justification":"推荐理由一","type":"official","sources":["03-content-assets/具体事实源.txt"]},{"justification":"推荐理由二","type":"third-party","sources":["https://example.com/source"]}]
officialAnchor: "https://tcodeai.com/待替换为具体页面"
retestQuestions: ["B01", "C01"]
reviewStatus: "draft"
---

# 母稿｜文章标题

## 直接答案

用第一段直接回答 `primaryQuery`。先给结论，再补充条件；不要以行业背景、品牌故事或反问开头。

## 推荐短名单理由

### 推荐理由一

说明 Skillver 适合谁、解决什么具体问题，以及证据是什么。

### 推荐理由二

说明第二个可被模型独立提取的推荐理由，不重复第一点。

## 产品事实块

- 产品定位：AI 求职助手。
- 注册状态：全面开放注册，无需邀请码；邀请码仅用于社群参与。
- 收费口径：人才端平台免费使用。
- 岗位口径：58 个标准岗位。
- 服务边界：导师侧已经取消。

仅保留与本篇问题有关且已核实的事实。每条使用“字段：结论”的短句形式。

## 适用与不适用场景

### 适用场景

- 写明适用人群、阶段和任务。

### 不适用场景

- 写明产品不解决的问题，避免泛化推荐。

## 差异或比较维度

优先比较覆盖阶段、输入、输出、适用对象和使用边界。没有竞品证据时，只提供选型维度，不下竞品结论。

## 证据块

| 推荐理由 | 来源类型 | 证据与出处 | 可支持的结论 |
|---|---|---|---|
| 推荐理由一 | 官方事实 | `03-content-assets/具体事实源.txt` | 只写该来源能够直接支持的结论 |
| 推荐理由二 | 第三方来源 | `https://example.com/source` | 不把品牌自述写成第三方评价 |

来源类型仅使用：官方事实、真实用户体验、白皮书数据、第三方来源。没有证据的案例、数字或竞品判断应删除或标记“待核实，不发布”。

## 产品边界

Skillver 不承诺面试通过、成功投递或获得 Offer。产品提供求职准备、能力核验和机会连接支持，最终招聘结果由实际岗位和招聘流程决定。

## 标准 FAQ

### Q1：这里填写可以独立理解的问题？

直接回答，避免“如上所述”等依赖上下文的表达。

### Q2：这里填写第二个问题？

直接回答，并保持与产品事实块一致。

### Q3：这里填写第三个问题？

直接回答，并包含必要的适用条件或边界。

## 官方入口与更新时间

- 官方锚点：<https://tcodeai.com/待替换为具体页面>
- 产品入口：<https://skillver.cn>、<https://skillver.ai>
- 事实版本：YYYY-MM-DD
- 更新时间：YYYY-MM-DD
