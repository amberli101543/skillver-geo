import { Type } from "class-transformer";

import {

  IsArray,

  IsIn,

  IsOptional,

  IsString,

  MaxLength,

  ValidateNested,

} from "class-validator";



class ModelProfileDto {

  @IsString()

  @MaxLength(40)

  id!: string;



  @IsString()

  @MaxLength(80)

  label!: string;



  @IsString()

  @MaxLength(80)

  model!: string;

  @IsOptional()
  @IsIn(["openai", "anthropic"])
  provider?: "openai" | "anthropic" | null;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  apiKey?: string | null;
}

class PromptVersionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  engine?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  scoring?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  content?: string | null;
}

export class UpdateAiSettingsDto {

  @IsOptional()

  @IsIn(["stub", "live"])

  engineMode?: "stub" | "live" | null;



  @IsOptional()

  @IsIn(["rule", "llm"])

  scoringMode?: "rule" | "llm" | null;



  @IsOptional()

  @IsIn(["stub", "live"])

  contentMode?: "stub" | "live" | null;



  @IsOptional()

  @IsString()

  @MaxLength(80)

  openAiModel?: string | null;



  @IsOptional()

  @IsString()

  @MaxLength(256)

  openAiApiKey?: string | null;



  @IsOptional()

  @IsArray()

  @ValidateNested({ each: true })

  @Type(() => ModelProfileDto)

  modelCatalog?: ModelProfileDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PromptVersionsDto)
  promptVersions?: PromptVersionsDto;
}

