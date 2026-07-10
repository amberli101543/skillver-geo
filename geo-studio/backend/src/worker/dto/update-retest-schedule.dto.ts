import { IsBoolean, IsInt, Max, Min } from "class-validator";

export class UpdateRetestScheduleDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(1)
  @Max(8760)
  intervalHours!: number;
}
