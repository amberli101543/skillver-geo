CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "channel_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

CREATE TABLE "distribution_tasks" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content_draft_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "distribution_tasks_content_draft_id_source_id_key" ON "distribution_tasks"("content_draft_id", "source_id");
CREATE INDEX "distribution_tasks_brand_id_status_idx" ON "distribution_tasks"("brand_id", "status");

CREATE TABLE "publish_records" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content_draft_id" TEXT NOT NULL,
    "source_id" TEXT,
    "distribution_task_id" TEXT,
    "channel" TEXT NOT NULL,
    "external_url" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publish_records_brand_id_published_at_idx" ON "publish_records"("brand_id", "published_at");

ALTER TABLE "distribution_tasks" ADD CONSTRAINT "distribution_tasks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distribution_tasks" ADD CONSTRAINT "distribution_tasks_content_draft_id_fkey" FOREIGN KEY ("content_draft_id") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "distribution_tasks" ADD CONSTRAINT "distribution_tasks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_content_draft_id_fkey" FOREIGN KEY ("content_draft_id") REFERENCES "content_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publish_records" ADD CONSTRAINT "publish_records_distribution_task_id_fkey" FOREIGN KEY ("distribution_task_id") REFERENCES "distribution_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
