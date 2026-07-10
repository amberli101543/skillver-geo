CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "engine_mode" TEXT,
    "scoring_mode" TEXT,
    "content_mode" TEXT,
    "open_ai_model" TEXT,
    "open_ai_api_key" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "app_settings" ("id", "updated_at") VALUES ('default', CURRENT_TIMESTAMP);
