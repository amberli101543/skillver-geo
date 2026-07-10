import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class RunDiagnosticBatchDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  engineIds?: string[];
}
