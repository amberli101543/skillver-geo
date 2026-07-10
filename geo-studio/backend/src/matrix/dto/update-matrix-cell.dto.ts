import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class UpdateMatrixCellDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  intent?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  angle?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  stage?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  audience?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;
}
