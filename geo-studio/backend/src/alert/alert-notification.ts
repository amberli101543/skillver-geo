export interface AlertNotificationConfig {
  webhookEnabled: boolean;
  webhookUrl: string | null;
  emailEnabled: boolean;
  emailTo: string | null;
}

export type AlertNotificationUpdate = Partial<AlertNotificationConfig>;

export interface ValidationError {
  field: string;
  message: string;
}

export function defaultAlertNotificationConfig(): AlertNotificationConfig {
  return {
    webhookEnabled: false,
    webhookUrl: process.env.ALERT_WEBHOOK_URL?.trim() || null,
    emailEnabled: false,
    emailTo: process.env.ALERT_EMAIL_TO?.trim() || null,
  };
}

export function validateAlertNotificationUpdate(input: AlertNotificationUpdate): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.webhookUrl !== undefined && input.webhookUrl !== null) {
    const trimmed = input.webhookUrl.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      errors.push({ field: "webhookUrl", message: "webhook URL must start with http:// or https://" });
    }
  }

  if (input.emailTo !== undefined && input.emailTo !== null) {
    const trimmed = input.emailTo.trim();
    if (trimmed && !trimmed.includes("@")) {
      errors.push({ field: "emailTo", message: "email must contain @" });
    }
  }

  return errors;
}

export interface AlertWebhookPayload {
  brandId: string;
  diagnosticRunId?: string;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
}
