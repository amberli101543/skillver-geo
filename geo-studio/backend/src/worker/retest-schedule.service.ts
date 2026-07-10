import { Injectable } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { RetestScheduleRepository } from "./retest-schedule.repository";
import {
  defaultRetestSchedule,
  validateRetestScheduleUpdate,
  type RetestSchedule,
  type RetestScheduleUpdate,
  type ValidationError,
} from "./retest-schedule";

export class RetestScheduleValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("retest schedule validation failed");
    this.name = "RetestScheduleValidationError";
  }
}

export class BrandNotFoundForScheduleError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundForScheduleError";
  }
}

@Injectable()
export class RetestScheduleService {
  constructor(
    private readonly brands: BrandService,
    private readonly repo: RetestScheduleRepository,
  ) {}

  async getSchedule(brandId: string): Promise<RetestSchedule> {
    await this.requireBrand(brandId);
    const row = await this.repo.findByBrandId(brandId);
    return row ?? defaultRetestSchedule(brandId);
  }

  async updateSchedule(brandId: string, input: RetestScheduleUpdate): Promise<RetestSchedule> {
    await this.requireBrand(brandId);
    const errors = validateRetestScheduleUpdate(input);
    if (errors.length > 0) {
      throw new RetestScheduleValidationError(errors);
    }
    return this.repo.upsert(brandId, input, new Date());
  }

  async findDue(now = new Date()): Promise<RetestSchedule[]> {
    return this.repo.findDue(now);
  }

  async markRunComplete(
    brandId: string,
    runAt: Date,
    intervalHours: number,
  ): Promise<RetestSchedule> {
    return this.repo.markRunComplete(brandId, runAt, intervalHours);
  }

  private async requireBrand(brandId: string): Promise<void> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundForScheduleError(brandId);
    }
  }
}
