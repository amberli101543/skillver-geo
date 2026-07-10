-- DropIndex
DROP INDEX "engine_tests_question_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "engine_tests_question_id_engine_id_key" ON "engine_tests"("question_id", "engine_id");
