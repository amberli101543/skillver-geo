# Validation — TASK-GEO-016

- [x] 改动文件（SPEC-GEO-007 实现，合并 016+017 提交）
  - backend/src/app.module.ts
  - backend/src/engine/engine.module.ts
  - backend/src/engine/engine-test.controller.ts
  - backend/src/engine/dto/run-engine-test.dto.ts
- [x] 文件改动数 ≤ 6：4 个源码 + 1 e2e（017）
- [x] 行变更总数 ≤ 300：约 80 行
- [x] typecheck PASS；`nest build` PASS
- [x] `commands.test` PASS：29 passed
- [x] replay：由 TASK-GEO-017 e2e + golden 覆盖
- [x] 无跨 service 联动（R6）
- [x] 用户已同意推进（「同意」）

**Result**: PASS

**Notes**:
- `POST /brands/:id/engine-tests`：body `{ question }`；校验品牌存在后调用 `EngineTestService.run`；Nest POST 默认 201。
- `EngineModule` imports BrandModule，注册 `EngineTestController`；`AppModule` imports EngineModule。
