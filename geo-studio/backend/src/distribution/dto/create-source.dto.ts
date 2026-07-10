import { IsIn, IsNumber, IsString, Max, Min, MinLength } from "class-validator";
import { CHANNEL_TYPES, SOURCE_TIERS } from "../source";

export class CreateSourceDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(SOURCE_TIERS)
  tier!: (typeof SOURCE_TIERS)[number];

  @IsNumber()
  @Min(0)
  @Max(100)
  weight!: number;

  @IsIn(CHANNEL_TYPES)
  channelType!: (typeof CHANNEL_TYPES)[number];
}
