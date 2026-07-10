-- CreateTable
CREATE TABLE "brand_knowledge_chunks" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "brand_knowledge_chunks_brand_id_source_type_idx" ON "brand_knowledge_chunks"("brand_id", "source_type");

ALTER TABLE "brand_knowledge_chunks" ADD CONSTRAINT "brand_knowledge_chunks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
