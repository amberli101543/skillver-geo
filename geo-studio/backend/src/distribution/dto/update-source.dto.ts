import { IsIn, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
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
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @IsOptional()
  @IsIn(CHANNEL_TYPES)
  channelType?: (typeof CHANNEL_TYPES)[number];
}
