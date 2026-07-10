import { Injectable, Logger } from "@nestjs/common";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandService } from "../brand/brand-service";
import { DiagnosticRunService } from "../diagnostics/diagnostic-run.service";
import { DistributionService } from "../distribution/distribution.service";
import { detectAlerts } from "./alert-detector";
import {
  validateAlertThresholdUpdate,
  validateAlertUpdate,
  type Alert,
  type AlertStatus,
  type AlertThresholdConfig,
  type AlertThresholdUpdate,
  type AlertUpdate,
  type ValidationError,
} from "./alert";
import { AlertRepository } from "./alert.repository";
import { AlertDispatcherService } from "./alert-dispatcher.service";
import {
  validateAlertNotificationUpdate,
  type AlertNotificationConfig,
  type AlertNotificationUpdate,
} from "./alert-notification";

export class BrandNotFoundForAlertError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundForAlertError";
  }
}

export class AlertNotFoundError extends Error {
  constructor(public readonly alertId: string) {
    super(`alert ${alertId} not found`);
    this.name = "AlertNotFoundError";
  }
}

export class AlertValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("alert validation failed");
    this.name = "AlertValidationError";
  }
}

export class DiagnosticRunNotFoundForAlertError extends Error {
  constructor(public readonly runId: string) {
    super(`diagnostic run ${runId} not found`);
    this.name = "DiagnosticRunNotFoundForAlertError";
  }
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly brands: BrandService,
    private readonly entities: BrandEntityService,
    private readonly runs: DiagnosticRunService,
    private readonly distribution: DistributionService,
    private readonly repo: AlertRepository,
    private readonly dispatcher: AlertDispatcherService,
  ) {}

  async listAlerts(brandId: string, status?: AlertStatus): Promise<Alert[]> {
    await this.requireBrand(brandId);
    return this.repo.listByBrand(brandId, status);
  }

  async updateAlert(brandId: string, alertId: string, input: AlertUpdate): Promise<Alert> {
    await this.requireBrand(brandId);
    const errors = validateAlertUpdate(input);
    if (errors.length > 0) {
      throw new AlertValidationError(errors);
    }
    const updated = await this.repo.updateStatus(brandId, alertId, input.status);
    if (!updated) {
      throw new AlertNotFoundError(alertId);
    }
    return updated;
  }

  async getThresholds(brandId: string): Promise<AlertThresholdConfig> {
    await this.requireBrand(brandId);
    return this.repo.getThresholds(brandId);
  }

  async updateThresholds(brandId: string, input: AlertThresholdUpdate): Promise<AlertThresholdConfig> {
    await this.requireBrand(brandId);
    const errors = validateAlertThresholdUpdate(input);
    if (errors.length > 0) {
      throw new AlertValidationError(errors);
    }
    return this.repo.upsertThresholds(brandId, input);
  }

  async getNotificationSettings(brandId: string): Promise<AlertNotificationConfig> {
    await this.requireBrand(brandId);
    return this.repo.getNotificationSettings(brandId);
  }

  async updateNotificationSettings(
    brandId: string,
    input: AlertNotificationUpdate,
  ): Promise<AlertNotificationConfig> {
    await this.requireBrand(brandId);
    const errors = validateAlertNotificationUpdate(input);
    if (errors.length > 0) {
      throw new AlertValidationError(errors);
    }
    return this.repo.upsertNotificationSettings(brandId, input);
  }

  async evaluateAfterRun(brandId: string, diagnosticRunId: string): Promise<Alert[]> {
    if (process.env.ALERTS_ENABLED === "false") {
      return [];
    }
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundForAlertError(brandId);
    }
    const detail = await this.runs.get(brandId, diagnosticRunId);
    if (!detail) {
      throw new DiagnosticRunNotFoundForAlertError(diagnosticRunId);
    }

    const [assertions, publishRecords, thresholds, runSummaries] = await Promise.all([
      this.entities.listAssertions(brandId),
      this.distribution.listPublishRecords(brandId),
      this.repo.getThresholds(brandId),
      this.runs.list(brandId),
    ]);

    const previousRun = runSummaries.find((run) => run.id !== diagnosticRunId);
    const previousMentionRate = previousRun?.metrics.mention_rate;

    const inputs = detectAlerts({
      brand,
      diagnosticRunId,
      baseline: detail.baseline,
      previousMentionRate,
      items: detail.items,
      assertions,
      publishRecords,
      thresholds,
    });

    const created = await this.repo.createMany(inputs);
    for (const alert of created) {
      this.logger.warn(
        `[${alert.severity}] ${alert.type} brand=${brandId} run=${diagnosticRunId}: ${alert.title} — ${alert.message}`,
      );
    }

    if (created.length > 0) {
      const notifications = await this.repo.getNotificationSettings(brandId);
      await this.dispatcher.dispatch(brandId, created, notifications, diagnosticRunId);
    }

    return created;
  }

  private async requireBrand(brandId: string): Promise<void> {
    if (!(await this.brands.get(brandId))) {
      throw new BrandNotFoundForAlertError(brandId);
    }
  }
}
