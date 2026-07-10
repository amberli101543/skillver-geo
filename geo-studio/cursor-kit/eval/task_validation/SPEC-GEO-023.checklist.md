# Validation — SPEC-GEO-023

- [x] Prisma `Alert` + `AlertThreshold` + migration
- [x] `alert-detector`：负面表述 / 低准确性 / 断言未覆盖 / 阈值 / 提及率下跌
- [x] 跑批 `runAndPersist` 后自动 `evaluateAfterRun` + 服务端 WARN 日志
- [x] `GET/PATCH /brands/:brandId/alerts` + `GET/PUT alert-thresholds`
- [x] 看板 `AlertsPanel`：列表、确认/解决、阈值配置
- [x] `npm --prefix backend test` PASS（116 用例）
- [x] `npm --prefix backend run typecheck` PASS
- [x] `npm --prefix web run build` PASS

**Result**: PASS

**Notes**: 设置 `ALERTS_ENABLED=false` 可关闭自动评估。阈值默认可通过环境变量 `ALERT_*` 覆盖，品牌级阈值存 `alert_thresholds` 表。
