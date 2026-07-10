import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { CHANNEL_TYPES, SOURCE_TIERS } from "../source";

export class UpdateSourceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(SOURCE_TIERS)
  tier?: (typeof SOURCE_TIERS)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsIn(CHANNEL_TYPES)
  channelType?: (typeof CHANNEL_TYPES)[number];
}

export class CreateDistributionTaskDto {
  @IsString()
  @MinLength(1)
  contentDraftId!: string;

  @IsString()
  @MinLength(1)
  sourceId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;
}

export class UpdateDistributionTaskDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsIn(["pending", "in_progress", "completed", "failed", "cancelled"])
  status?: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
}

export class CreatePublishRecordDto {
  @IsString()
  @MinLength(1)
  contentDraftId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sourceId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  distributionTaskId?: string;

  @IsString()
  @MinLength(1)
  channel!: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsString()
  publishedAt?: string;
}
