import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
} from "@nestjs/common";
import { UpdateRetestScheduleDto } from "./dto/update-retest-schedule.dto";
import {
  BrandNotFoundForScheduleError,
  RetestScheduleService,
  RetestScheduleValidationError,
} from "./retest-schedule.service";
import { type RetestSchedule } from "./retest-schedule";

@Controller("brands/:brandId/retest-schedule")
export class RetestScheduleController {
  constructor(private readonly schedules: RetestScheduleService) {}

  @Get()
  async get(@Param("brandId") brandId: string): Promise<RetestSchedule> {
    return this.handle(() => this.schedules.getSchedule(brandId));
  }

  @Put()
  async update(
    @Param("brandId") brandId: string,
    @Body() dto: UpdateRetestScheduleDto,
  ): Promise<RetestSchedule> {
    return this.handle(() =>
      this.schedules.updateSchedule(brandId, {
        enabled: dto.enabled,
        intervalHours: dto.intervalHours,
      }),
    );
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof BrandNotFoundForScheduleError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof RetestScheduleValidationError) {
        throw new BadRequestException(err.errors);
      }
      throw err;
    }
  }
}
