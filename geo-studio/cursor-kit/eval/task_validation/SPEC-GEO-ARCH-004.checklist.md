# Validation — SPEC-GEO-ARCH-004（连接器注册表）

- [x] `EngineRegistry` + `RegisteredEngineConnector`；默认 `openai-proxy`
- [x] `PublishRegistry` + `ExportPublishConnector` + `CmsApiPublishConnector` + `RegisteredPublishConnector`
- [x] `EngineModule` / `DistributionModule` 经 registry 注入 Connector
- [x] `docs/CONNECTORS.md` 能力矩阵（stub/live、env、channelType）
- [x] `engine-registry.test.ts` + `publish-registry.test.ts` PASS
- [x] `npm --prefix backend test` PASS（144 tests）
- [x] `npm --prefix backend run typecheck` PASS
