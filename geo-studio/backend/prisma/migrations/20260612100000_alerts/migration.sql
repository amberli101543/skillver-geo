CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "diagnostic_run_id" TEXT,
    "question_id" TEXT,
    "metric" TEXT,
    "metric_value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alert_thresholds" (
    "brand_id" TEXT NOT NULL,
    "mention_rate_min" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "avg_accuracy_min" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "item_accuracy_min" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "mention_drop_max" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_thresholds_pkey" PRIMARY KEY ("brand_id")
);

CREATE INDEX "alerts_brand_id_status_created_at_idx" ON "alerts"("brand_id", "status", "created_at");

ALTER TABLE "alerts" ADD CONSTRAINT "alerts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alert_thresholds" ADD CONSTRAINT "alert_thresholds_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
