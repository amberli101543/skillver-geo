export type AlertType = "misinformation" | "threshold" | "metric_drop";
export type AlertSeverity = "warn" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface AlertThresholdConfig {
  mentionRateMin: number;
  avgAccuracyMin: number;
  itemAccuracyMin: number;
  mentionDropMax: number;
}

export interface Alert {
  id: string;
  brandId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  diagnosticRunId?: string;
  questionId?: string;
  metric?: string;
  metricValue?: number;
  threshold?: number;
  createdAt: string;
  updatedAt: string;
}

export type AlertInput = Omit<Alert, "id" | "createdAt" | "updatedAt">;
export type AlertUpdate = { status: AlertStatus };
export type AlertThresholdUpdate = Partial<AlertThresholdConfig>;

export interface ValidationError {
  field: string;
  message: string;
}

export const ALERT_TYPES: AlertType[] = ["misinformation", "threshold", "metric_drop"];
export const ALERT_STATUSES: AlertStatus[] = ["open", "acknowledged", "resolved"];

export function defaultAlertThresholds(): AlertThresholdConfig {
  return {
    mentionRateMin: readEnvNumber("ALERT_MENTION_RATE_MIN", 0.4),
    avgAccuracyMin: readEnvNumber("ALERT_AVG_ACCURACY_MIN", 0.5),
    itemAccuracyMin: readEnvNumber("ALERT_ITEM_ACCURACY_MIN", 0.5),
    mentionDropMax: readEnvNumber("ALERT_MENTION_DROP_MAX", 0.15),
  };
}

export function validateAlertThresholdUpdate(input: AlertThresholdUpdate): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const [field, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (typeof value !== "number" || value < 0 || value > 1) {
      errors.push({ field, message: "threshold must be between 0 and 1" });
    }
  }
  return errors;
}

export function validateAlertUpdate(input: AlertUpdate): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ALERT_STATUSES.includes(input.status)) {
    errors.push({ field: "status", message: "invalid status" });
  }
  return errors;
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
