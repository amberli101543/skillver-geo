# Validation — SPEC-GEO-PROD-001

## 文档与规划

- [x] 编写产品 v1 Definition of Done（用户旅程 / API Parity / AI 前台化 / 工程质量）
- [x] 明确 v1 范围冻结：仅 SPEC-GEO-026，完成后标记 v1 DONE
- [x] 明确 v1 外 Backlog（Figma、外推告警、多引擎等）
- [x] 创建 SPEC-GEO-026 + TASK-GEO-054/055/056
- [x] ROADMAP 更新 v1 收官节与 v2 Backlog

## 产品 v1 DoD 实施验收（2026-06-12）

### 1. 用户旅程

- [x] 建品牌、切换品牌
- [x] 录入竞品、断言
- [x] 一键跑批、单题试跑、跑批明细
- [x] 同步缺口、矩阵管理
- [x] 生成初稿、编辑正文、提交审核
- [x] 信源与分发、自动发布/导出
- [x] 定时复测开关与间隔
- [x] 趋势图、告警列表与阈值

### 2. API Parity

- [x] SPEC-GEO-026 固定 8 断点已接线（见 SPEC-GEO-026.checklist.md）

### 3. AI 前台化

- [x] 看板可见 AI 状态（页头 + AI 设置面板）
- [x] env 配置说明文案
- [x] 单题试跑即时结果
- [x] 跑批明细 scoringMode 提示
- [x] 无断言时内容路径 warning

### 4. 工程质量

- [x] backend test PASS
- [x] backend typecheck PASS
- [x] web build PASS

**Result**: PASS — **产品 v1 DONE**  
**Notes**: 实施验收以 SPEC-GEO-026 checklist 为准；ship `e4967b9`。
