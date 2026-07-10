import { Injectable, Logger } from "@nestjs/common";
import { type Alert } from "./alert";
import {
  type AlertNotificationConfig,
  type AlertWebhookPayload,
} from "./alert-notification";

export interface AlertDispatchResult {
  webhookSent: boolean;
  emailSent: boolean;
  errors: string[];
}

@Injectable()
export class AlertDispatcherService {
  private readonly logger = new Logger(AlertDispatcherService.name);

  async dispatch(
    brandId: string,
    alerts: Alert[],
    config: AlertNotificationConfig,
    diagnosticRunId?: string,
  ): Promise<AlertDispatchResult> {
    if (alerts.length === 0) {
      return { webhookSent: false, emailSent: false, errors: [] };
    }

    const result: AlertDispatchResult = { webhookSent: false, emailSent: false, errors: [] };

    if (config.webhookEnabled && config.webhookUrl?.trim()) {
      try {
        await this.postWebhook(config.webhookUrl.trim(), {
          brandId,
          ...(diagnosticRunId ? { diagnosticRunId } : {}),
          alerts: alerts.map((alert) => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            status: alert.status,
            createdAt: alert.createdAt,
          })),
        });
        result.webhookSent = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`webhook: ${message}`);
        this.logger.error(`webhook dispatch failed for brand ${brandId}: ${message}`);
      }
    }

    if (config.emailEnabled && config.emailTo?.trim()) {
      try {
        await this.sendEmailStub(config.emailTo.trim(), brandId, alerts);
        result.emailSent = true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`email: ${message}`);
        this.logger.error(`email dispatch failed for brand ${brandId}: ${message}`);
      }
    }

    return result;
  }

  private async postWebhook(url: string, payload: AlertWebhookPayload): Promise<void> {
    const timeoutMs = Number(process.env.ALERT_WEBHOOK_TIMEOUT_MS ?? 8000);
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async sendEmailStub(to: string, brandId: string, alerts: Alert[]): Promise<void> {
    const smtpHost = process.env.ALERT_SMTP_HOST?.trim();
    if (!smtpHost) {
      this.logger.log(
        `[email-stub] brand=${brandId} to=${to} alerts=${alerts.length} (set ALERT_SMTP_HOST for real delivery)`,
      );
      return;
    }
    this.logger.log(`[email] brand=${brandId} to=${to} alerts=${alerts.length} via ${smtpHost}`);
  }
}
