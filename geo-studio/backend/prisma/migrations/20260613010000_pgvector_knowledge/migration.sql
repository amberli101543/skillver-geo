-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Replace JSONB embedding with native vector column (1536 = text-embedding-3-small default)
ALTER TABLE "brand_knowledge_chunks" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "brand_knowledge_chunks" ADD COLUMN "embedding" vector(1536);

CREATE INDEX "brand_knowledge_chunks_embedding_hnsw_idx"
  ON "brand_knowledge_chunks"
  USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;
