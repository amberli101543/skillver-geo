import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateAssertionDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsString()
  evidence?: string;
}
