CREATE TABLE "content_drafts" (
    "id" TEXT NOT NULL,
    "cell_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_drafts_cell_id_version_key" ON "content_drafts"("cell_id", "version");

ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "matrix_cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;
