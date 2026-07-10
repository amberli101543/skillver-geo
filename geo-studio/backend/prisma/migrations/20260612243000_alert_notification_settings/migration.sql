-- CreateTable
CREATE TABLE "alert_notification_settings" (
    "brand_id" TEXT NOT NULL,
    "webhook_enabled" BOOLEAN NOT NULL DEFAULT false,
    "webhook_url" TEXT,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_to" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_notification_settings_pkey" PRIMARY KEY ("brand_id")
);

ALTER TABLE "alert_notification_settings" ADD CONSTRAINT "alert_notification_settings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
