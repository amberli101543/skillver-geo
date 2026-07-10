-- CreateTable
CREATE TABLE "diagnostic_runs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "question_count" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "diagnostic_run_id" TEXT,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_runs_brand_id_tenant_id_captured_at_idx" ON "diagnostic_runs"("brand_id", "tenant_id", "captured_at");

-- CreateIndex
CREATE INDEX "metric_snapshots_brand_id_tenant_id_metric_captured_at_idx" ON "metric_snapshots"("brand_id", "tenant_id", "metric", "captured_at");

-- AddForeignKey
ALTER TABLE "diagnostic_runs" ADD CONSTRAINT "diagnostic_runs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_diagnostic_run_id_fkey" FOREIGN KEY ("diagnostic_run_id") REFERENCES "diagnostic_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
