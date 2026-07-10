import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  defaultAlertThresholds,
  type Alert,
  type AlertInput,
  type AlertStatus,
  type AlertThresholdConfig,
  type AlertThresholdUpdate,
} from "./alert";
import {
  defaultAlertNotificationConfig,
  type AlertNotificationConfig,
  type AlertNotificationUpdate,
} from "./alert-notification";

export abstract class AlertRepository {
  abstract listByBrand(brandId: string, status?: AlertStatus): Promise<Alert[]>;
  abstract createMany(inputs: AlertInput[]): Promise<Alert[]>;
  abstract updateStatus(brandId: string, alertId: string, status: AlertStatus): Promise<Alert | null>;
  abstract getThresholds(brandId: string): Promise<AlertThresholdConfig>;
  abstract upsertThresholds(brandId: string, input: AlertThresholdUpdate): Promise<AlertThresholdConfig>;
  abstract getNotificationSettings(brandId: string): Promise<AlertNotificationConfig>;
  abstract upsertNotificationSettings(
    brandId: string,
    input: AlertNotificationUpdate,
  ): Promise<AlertNotificationConfig>;
}

function toAlert(row: {
  id: string;
  brandId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  diagnosticRunId: string | null;
  questionId: string | null;
  metric: string | null;
  metricValue: number | null;
  threshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}): Alert {
  return {
    id: row.id,
    brandId: row.brandId,
    type: row.type as Alert["type"],
    severity: row.severity as Alert["severity"],
    title: row.title,
    message: row.message,
    status: row.status as Alert["status"],
    ...(row.diagnosticRunId ? { diagnosticRunId: row.diagnosticRunId } : {}),
    ...(row.questionId ? { questionId: row.questionId } : {}),
    ...(row.metric ? { metric: row.metric } : {}),
    ...(row.metricValue !== null ? { metricValue: row.metricValue } : {}),
    ...(row.threshold !== null ? { threshold: row.threshold } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PrismaAlertRepository extends AlertRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByBrand(brandId: string, status?: AlertStatus): Promise<Alert[]> {
    const rows = await this.prisma.alert.findMany({
      where: {
        brandId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toAlert);
  }

  async createMany(inputs: AlertInput[]): Promise<Alert[]> {
    if (inputs.length === 0) return [];
    const rows = await this.prisma.$transaction(
      inputs.map((input) =>
        this.prisma.alert.create({
          data: {
            brandId: input.brandId,
            type: input.type,
            severity: input.severity,
            title: input.title,
            message: input.message,
            status: input.status,
            ...(input.diagnosticRunId ? { diagnosticRunId: input.diagnosticRunId } : {}),
            ...(input.questionId ? { questionId: input.questionId } : {}),
            ...(input.metric ? { metric: input.metric } : {}),
            ...(input.metricValue !== undefined ? { metricValue: input.metricValue } : {}),
            ...(input.threshold !== undefined ? { threshold: input.threshold } : {}),
          },
        }),
      ),
    );
    return rows.map(toAlert);
  }

  async updateStatus(brandId: string, alertId: string, status: AlertStatus): Promise<Alert | null> {
    const existing = await this.prisma.alert.findFirst({ where: { id: alertId, brandId } });
    if (!existing) return null;
    const row = await this.prisma.alert.update({
      where: { id: alertId },
      data: { status },
    });
    return toAlert(row);
  }

  async getThresholds(brandId: string): Promise<AlertThresholdConfig> {
    const row = await this.prisma.alertThreshold.findUnique({ where: { brandId } });
    if (!row) return defaultAlertThresholds();
    return {
      mentionRateMin: row.mentionRateMin,
      avgAccuracyMin: row.avgAccuracyMin,
      itemAccuracyMin: row.itemAccuracyMin,
      mentionDropMax: row.mentionDropMax,
    };
  }

  async upsertThresholds(brandId: string, input: AlertThresholdUpdate): Promise<AlertThresholdConfig> {
    const current = await this.getThresholds(brandId);
    const next = { ...current, ...input };
    const row = await this.prisma.alertThreshold.upsert({
      where: { brandId },
      create: { brandId, ...next },
      update: next,
    });
    return {
      mentionRateMin: row.mentionRateMin,
      avgAccuracyMin: row.avgAccuracyMin,
      itemAccuracyMin: row.itemAccuracyMin,
      mentionDropMax: row.mentionDropMax,
    };
  }

  async getNotificationSettings(brandId: string): Promise<AlertNotificationConfig> {
    const row = await this.prisma.alertNotificationSettings.findUnique({ where: { brandId } });
    if (!row) return defaultAlertNotificationConfig();
    return {
      webhookEnabled: row.webhookEnabled,
      webhookUrl: row.webhookUrl?.trim() || null,
      emailEnabled: row.emailEnabled,
      emailTo: row.emailTo?.trim() || null,
    };
  }

  async upsertNotificationSettings(
    brandId: string,
    input: AlertNotificationUpdate,
  ): Promise<AlertNotificationConfig> {
    const current = await this.getNotificationSettings(brandId);
    const next = {
      webhookEnabled: input.webhookEnabled ?? current.webhookEnabled,
      webhookUrl:
        input.webhookUrl !== undefined
          ? input.webhookUrl?.trim() || null
          : current.webhookUrl,
      emailEnabled: input.emailEnabled ?? current.emailEnabled,
      emailTo: input.emailTo !== undefined ? input.emailTo?.trim() || null : current.emailTo,
    };
    const row = await this.prisma.alertNotificationSettings.upsert({
      where: { brandId },
      create: { brandId, ...next },
      update: next,
    });
    return {
      webhookEnabled: row.webhookEnabled,
      webhookUrl: row.webhookUrl?.trim() || null,
      emailEnabled: row.emailEnabled,
      emailTo: row.emailTo?.trim() || null,
    };
  }
}
