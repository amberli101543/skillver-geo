CREATE TABLE "matrix_cells" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matrix_cells_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "matrix_cells_brand_id_intent_angle_key" ON "matrix_cells"("brand_id", "intent", "angle");
CREATE INDEX "matrix_cells_brand_id_priority_idx" ON "matrix_cells"("brand_id", "priority");

ALTER TABLE "matrix_cells" ADD CONSTRAINT "matrix_cells_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
