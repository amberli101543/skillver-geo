-- GEO-041: persist RAG snippets used during content generation
ALTER TABLE "content_drafts" ADD COLUMN "rag_snippets" JSONB;
