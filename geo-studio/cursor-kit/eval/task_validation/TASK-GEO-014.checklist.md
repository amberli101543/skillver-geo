# Validation — TASK-GEO-014

- [x] 仅修改了 task 卡 `files_to_touch` 中的文件
  - backend/src/engine/engine-connector.ts
  - backend/src/engine/engine-connector.test.ts
  - backend/src/engine/proxy-engine-connector.ts
- [x] 文件改动数 ≤ 6：3 个（+1 golden case 输出）
- [x] 行变更总数 ≤ 300：约 70 行
- [x] `commands.test` PASS：`npm --prefix backend test` → engine-connector 3 用例通过
- [x] typecheck PASS：`tsc --noEmit` 通过
- [x] replay / golden case：eval/golden_cases/engine/proxy-engine-001.json（stub 含 answer+sources+engineId，deterministic）
- [x] 无跨 service 联动改动（R6）：仅 backend
- [x] plan + risk 已获批准（已收到「批准 TASK-GEO-014-015」）
- [ ] commit message 含 `[type]: [scope]`（待统一提交）

**Result**: PASS

**Notes**:
- `EngineConnector` 抽象 + `EngineAnswer`/`EngineSource` 类型；`stubEngineAnswer` 为 deterministic 纯函数（simpleDigest）。
- `ProxyEngineConnector`：无 `OPENAI_API_KEY` 时走 stub；有 Key 时仍走 stub（真实 LLM 调用留待后续 integration SPEC，保证 CI 可预测）。
- 对应产品方案路径 B「代理引擎评估」的领域层第一步。
