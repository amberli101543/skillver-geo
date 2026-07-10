-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "diagnostic_run_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engine_tests" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "engine_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "run_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engine_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_scores" (
    "id" TEXT NOT NULL,
    "engine_test_id" TEXT NOT NULL,
    "mentioned" BOOLEAN NOT NULL,
    "mention_position" INTEGER,
    "sentiment" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "sources_count" INTEGER NOT NULL,

    CONSTRAINT "test_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_diagnostic_run_id_idx" ON "questions"("diagnostic_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "engine_tests_question_id_key" ON "engine_tests"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_scores_engine_test_id_key" ON "test_scores"("engine_test_id");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_diagnostic_run_id_fkey" FOREIGN KEY ("diagnostic_run_id") REFERENCES "diagnostic_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engine_tests" ADD CONSTRAINT "engine_tests_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_scores" ADD CONSTRAINT "test_scores_engine_test_id_fkey" FOREIGN KEY ("engine_test_id") REFERENCES "engine_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
