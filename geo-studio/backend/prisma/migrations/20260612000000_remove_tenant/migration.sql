-- Drop tenant-scoped indexes
DROP INDEX IF EXISTS "brands_tenant_id_idx";
DROP INDEX IF EXISTS "diagnostic_runs_brand_id_tenant_id_captured_at_idx";
DROP INDEX IF EXISTS "metric_snapshots_brand_id_tenant_id_metric_captured_at_idx";

-- Drop tenant columns (single-user product)
ALTER TABLE "brands" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "diagnostic_runs" DROP COLUMN IF EXISTS "tenant_id";
ALTER TABLE "metric_snapshots" DROP COLUMN IF EXISTS "tenant_id";

-- Recreate indexes without tenant
CREATE INDEX "diagnostic_runs_brand_id_captured_at_idx" ON "diagnostic_runs"("brand_id", "captured_at");
CREATE INDEX "metric_snapshots_brand_id_metric_captured_at_idx" ON "metric_snapshots"("brand_id", "metric", "captured_at");
