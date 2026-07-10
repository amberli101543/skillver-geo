# Validation — SPEC-GEO-022

- [x] `publish-connector.ts` + stub CMS / 导出稿件 + 单元测试
- [x] `POST /brands/:brandId/distribution-tasks/:taskId/execute`
- [x] api 渠道自动创建 PublishRecord 并完成任务
- [x] export/manual 渠道返回可下载 Markdown 稿件
- [x] 看板 DistributionPanel「自动发布 / 导出稿件」按钮
- [x] `npm --prefix backend test` PASS
- [x] `npm --prefix backend run typecheck` PASS
- [x] `npm --prefix web run build` PASS

**Result**: PASS

**Notes**: 配置 `CMS_API_URL` + `CMS_API_KEY` 走真实 CMS；未配置时使用 stub URL。export/manual 任务保持 `in_progress`，需人工发布后手动记录。
