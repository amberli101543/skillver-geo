-- CreateTable
CREATE TABLE "assertions" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "evidence" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assertions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assertions_brand_id_idx" ON "assertions"("brand_id");

-- CreateIndex
CREATE INDEX "competitors_brand_id_idx" ON "competitors"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitors_brand_id_name_key" ON "competitors"("brand_id", "name");

-- AddForeignKey
ALTER TABLE "assertions" ADD CONSTRAINT "assertions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
