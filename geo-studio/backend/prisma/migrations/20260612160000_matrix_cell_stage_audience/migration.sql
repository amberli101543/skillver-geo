ALTER TABLE "matrix_cells" ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT '全阶段';
ALTER TABLE "matrix_cells" ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT '通用受众';

ALTER TABLE "matrix_cells" DROP CONSTRAINT IF EXISTS "matrix_cells_brand_id_intent_angle_key";

CREATE UNIQUE INDEX IF NOT EXISTS "matrix_cells_brand_id_intent_angle_stage_audience_key"
  ON "matrix_cells"("brand_id", "intent", "angle", "stage", "audience");
