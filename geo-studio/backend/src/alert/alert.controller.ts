import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Put,
  Query,
} from "@nestjs/common";
import {
  AlertNotFoundError,
  AlertService,
  AlertValidationError,
  BrandNotFoundForAlertError,
} from "./alert.service";
import { type Alert, type AlertStatus, type AlertThresholdConfig } from "./alert";
import { UpdateAlertDto, UpdateAlertNotificationsDto, UpdateAlertThresholdsDto } from "./dto/update-alert.dto";
import { type AlertNotificationConfig } from "./alert-notification";

@Controller("brands/:brandId")
export class AlertController {
  constructor(private readonly alerts: AlertService) {}

  @Get("alerts")
  async list(
    @Param("brandId") brandId: string,
    @Query("status") status?: AlertStatus,
  ): Promise<Alert[]> {
    return this.handle(() => this.alerts.listAlerts(brandId, status));
  }

  @Patch("alerts/:alertId")
  async update(
    @Param("brandId") brandId: string,
    @Param("alertId") alertId: string,
    @Body() dto: UpdateAlertDto,
  ): Promise<Alert> {
    return this.handle(() => this.alerts.updateAlert(brandId, alertId, { status: dto.status }));
  }

  @Get("alert-thresholds")
  async getThresholds(@Param("brandId") brandId: string): Promise<AlertThresholdConfig> {
    return this.handle(() => this.alerts.getThresholds(brandId));
  }

  @Put("alert-thresholds")
  async updateThresholds(
    @Param("brandId") brandId: string,
    @Body() dto: UpdateAlertThresholdsDto,
  ): Promise<AlertThresholdConfig> {
    return this.handle(() =>
      this.alerts.updateThresholds(brandId, {
        ...(dto.mentionRateMin !== undefined ? { mentionRateMin: dto.mentionRateMin } : {}),
        ...(dto.avgAccuracyMin !== undefined ? { avgAccuracyMin: dto.avgAccuracyMin } : {}),
        ...(dto.itemAccuracyMin !== undefined ? { itemAccuracyMin: dto.itemAccuracyMin } : {}),
        ...(dto.mentionDropMax !== undefined ? { mentionDropMax: dto.mentionDropMax } : {}),
      }),
    );
  }

  @Get("alert-notifications")
  async getNotifications(@Param("brandId") brandId: string): Promise<AlertNotificationConfig> {
    return this.handle(() => this.alerts.getNotificationSettings(brandId));
  }

  @Put("alert-notifications")
  async updateNotifications(
    @Param("brandId") brandId: string,
    @Body() dto: UpdateAlertNotificationsDto,
  ): Promise<AlertNotificationConfig> {
    return this.handle(() =>
      this.alerts.updateNotificationSettings(brandId, {
        ...(dto.webhookEnabled !== undefined ? { webhookEnabled: dto.webhookEnabled } : {}),
        ...(dto.webhookUrl !== undefined ? { webhookUrl: dto.webhookUrl } : {}),
        ...(dto.emailEnabled !== undefined ? { emailEnabled: dto.emailEnabled } : {}),
        ...(dto.emailTo !== undefined ? { emailTo: dto.emailTo } : {}),
      }),
    );
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof BrandNotFoundForAlertError || err instanceof AlertNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof AlertValidationError) {
        throw new BadRequestException(err.errors);
      }
      throw err;
    }
  }
}
