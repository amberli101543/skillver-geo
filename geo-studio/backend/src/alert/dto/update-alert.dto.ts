import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ALERT_STATUSES, type AlertStatus } from "../alert";

export class UpdateAlertDto {
  @IsIn(ALERT_STATUSES)
  status!: AlertStatus;
}

export class UpdateAlertThresholdsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  mentionRateMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  avgAccuracyMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  itemAccuracyMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  mentionDropMax?: number;
}

export class UpdateAlertNotificationsDto {
  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  webhookUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  emailTo?: string | null;
}
