import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  computeNextRunAt,
  toRetestSchedule,
  type RetestSchedule,
  type RetestScheduleUpdate,
} from "./retest-schedule";

export abstract class RetestScheduleRepository {
  abstract findByBrandId(brandId: string): Promise<RetestSchedule | null>;
  abstract upsert(brandId: string, input: RetestScheduleUpdate, now: Date): Promise<RetestSchedule>;
  abstract markRunComplete(
    brandId: string,
    runAt: Date,
    intervalHours: number,
  ): Promise<RetestSchedule>;
  abstract findDue(now: Date): Promise<RetestSchedule[]>;
}

@Injectable()
export class PrismaRetestScheduleRepository extends RetestScheduleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByBrandId(brandId: string): Promise<RetestSchedule | null> {
    const row = await this.prisma.retestSchedule.findUnique({ where: { brandId } });
    return row ? toRetestSchedule(row) : null;
  }

  async upsert(brandId: string, input: RetestScheduleUpdate, now: Date): Promise<RetestSchedule> {
    const existing = await this.prisma.retestSchedule.findUnique({ where: { brandId } });
    const nextRunAt = input.enabled
      ? existing?.nextRunAt && existing.nextRunAt > now
        ? existing.nextRunAt
        : now
      : null;

    const row = await this.prisma.retestSchedule.upsert({
      where: { brandId },
      create: {
        brandId,
        enabled: input.enabled,
        intervalHours: input.intervalHours,
        nextRunAt,
      },
      update: {
        enabled: input.enabled,
        intervalHours: input.intervalHours,
        nextRunAt,
      },
    });
    return toRetestSchedule(row);
  }

  async markRunComplete(
    brandId: string,
    runAt: Date,
    intervalHours: number,
  ): Promise<RetestSchedule> {
    const row = await this.prisma.retestSchedule.update({
      where: { brandId },
      data: {
        lastRunAt: runAt,
        nextRunAt: computeNextRunAt(runAt, intervalHours),
      },
    });
    return toRetestSchedule(row);
  }

  async findDue(now: Date): Promise<RetestSchedule[]> {
    const rows = await this.prisma.retestSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: "asc" },
    });
    return rows.map(toRetestSchedule);
  }
}
