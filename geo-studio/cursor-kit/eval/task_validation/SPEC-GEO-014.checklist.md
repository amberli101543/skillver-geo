# Validation — SPEC-GEO-014（单用户化 / 去 tenant）

- [x] Prisma 三表移除 tenant_id + 新迁移 20260612000000_remove_tenant（DROP 列与索引、重建索引）
- [x] Brand 领域/仓储/服务/控制器去 tenantId；findById(id)/list()
- [x] 诊断 service/controller、batch service/controller 去 tenant
- [x] 引擎实测控制器去 tenant
- [x] metrics 类型/仓储/服务/控制器去 tenant；persistBaseline 改为 $transaction（原子）
- [x] 抽 backend/src/common/csv.ts，消除两个诊断控制器 splitCsv 重复
- [x] 删除 requireTenant 与「without tenant header -> 400」「tenant isolation」用例
- [x] 前端 api.ts/Dashboard/CreateBrandModal 移除 tenant 输入与请求头
- [x] rg `tenant` 在 backend/src 与 web/src 均为 0
- [x] npm --prefix backend run typecheck PASS
- [x] npm --prefix backend test PASS（15 files / 39 tests）
- [x] npm --prefix web run build PASS

**Result**: PASS

**Notes**: 本地无 DB 时迁移以 SQL 文件入库；`prisma migrate deploy` 在 DB 可用时执行。
旧 init 迁移仍含 tenant_id 历史，新迁移负责 DROP，符合 Prisma 迁移链。
