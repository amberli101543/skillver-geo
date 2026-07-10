import { IsOptional, IsString, MinLength } from "class-validator";

export class RunEngineTestDto {
  @IsString()
  @MinLength(1)
  question!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  engineId?: string;
}
