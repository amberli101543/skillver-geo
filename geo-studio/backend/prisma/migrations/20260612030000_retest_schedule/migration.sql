CREATE TABLE "retest_schedules" (
    "brand_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "interval_hours" INTEGER NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retest_schedules_pkey" PRIMARY KEY ("brand_id")
);

CREATE INDEX "retest_schedules_enabled_next_run_at_idx" ON "retest_schedules"("enabled", "next_run_at");

ALTER TABLE "retest_schedules" ADD CONSTRAINT "retest_schedules_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
