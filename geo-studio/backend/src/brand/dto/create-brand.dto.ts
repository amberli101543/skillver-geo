import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateBrandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  definition!: string;

  @IsOptional()
  @IsString()
  positioning?: string;
}
