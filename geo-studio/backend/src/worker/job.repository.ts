import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { type CreateJobInput, type JobRecord, type JobStatus, type JobStatusCounts, type JobType } from "./job.types";

export abstract class JobRepository {
  abstract create(input: CreateJobInput): Promise<JobRecord>;
  abstract findById(id: string): Promise<JobRecord | null>;
  abstract listPending(limit: number): Promise<JobRecord[]>;
  abstract listRecent(limit: number): Promise<JobRecord[]>;
  abstract countByStatus(): Promise<JobStatusCounts>;
  abstract markRunning(id: string, startedAt: Date): Promise<JobRecord>;
  abstract markCompleted(id: string, result: unknown, completedAt: Date): Promise<JobRecord>;
  abstract markFailed(id: string, error: string, completedAt: Date): Promise<JobRecord>;
}

function toRecord(row: {
  id: string;
  type: string;
  brandId: string | null;
  status: string;
  payload: unknown;
  result: unknown;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): JobRecord {
  return {
    id: row.id,
    type: row.type as JobType,
    brandId: row.brandId,
    status: row.status as JobStatus,
    payload: row.payload as Record<string, unknown>,
    result: row.result ?? null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class PrismaJobRepository extends JobRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateJobInput): Promise<JobRecord> {
    const row = await this.prisma.job.create({
      data: {
        type: input.type,
        brandId: input.brandId,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<JobRecord | null> {
    const row = await this.prisma.job.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async listPending(limit: number): Promise<JobRecord[]> {
    const rows = await this.prisma.job.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async listRecent(limit: number): Promise<JobRecord[]> {
    const rows = await this.prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async countByStatus(): Promise<JobStatusCounts> {
    const groups = await this.prisma.job.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts: JobStatusCounts = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const group of groups) {
      const status = group.status as JobStatus;
      if (status in counts) {
        counts[status] = group._count._all;
      }
    }
    return counts;
  }

  async markRunning(id: string, startedAt: Date): Promise<JobRecord> {
    const row = await this.prisma.job.update({
      where: { id },
      data: { status: "running", startedAt },
    });
    return toRecord(row);
  }

  async markCompleted(id: string, result: unknown, completedAt: Date): Promise<JobRecord> {
    const row = await this.prisma.job.update({
      where: { id },
      data: { status: "completed", result: result as Prisma.InputJsonValue, completedAt, error: null },
    });
    return toRecord(row);
  }

  async markFailed(id: string, error: string, completedAt: Date): Promise<JobRecord> {
    const row = await this.prisma.job.update({
      where: { id },
      data: { status: "failed", error, completedAt },
    });
    return toRecord(row);
  }
}

export class InMemoryJobRepository extends JobRepository {
  private readonly rows = new Map<string, JobRecord>();
  private seq = 0;

  async create(input: CreateJobInput): Promise<JobRecord> {
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: `job_${++this.seq}`,
      type: input.type,
      brandId: input.brandId,
      status: "pending",
      payload: input.payload,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
    };
    this.rows.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<JobRecord | null> {
    return this.rows.get(id) ?? null;
  }

  async listPending(limit: number): Promise<JobRecord[]> {
    return [...this.rows.values()]
      .filter((j) => j.status === "pending")
      .slice(0, limit);
  }

  async listRecent(limit: number): Promise<JobRecord[]> {
    return [...this.rows.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async countByStatus(): Promise<JobStatusCounts> {
    const counts: JobStatusCounts = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const job of this.rows.values()) {
      counts[job.status] += 1;
    }
    return counts;
  }

  async markRunning(id: string, startedAt: Date): Promise<JobRecord> {
    const job = this.rows.get(id);
    if (!job) throw new Error(`job ${id} not found`);
    const next = {
      ...job,
      status: "running" as const,
      startedAt: startedAt.toISOString(),
      updatedAt: startedAt.toISOString(),
    };
    this.rows.set(id, next);
    return next;
  }

  async markCompleted(id: string, result: unknown, completedAt: Date): Promise<JobRecord> {
    const job = this.rows.get(id);
    if (!job) throw new Error(`job ${id} not found`);
    const next = {
      ...job,
      status: "completed" as const,
      result,
      error: null,
      completedAt: completedAt.toISOString(),
      updatedAt: completedAt.toISOString(),
    };
    this.rows.set(id, next);
    return next;
  }

  async markFailed(id: string, error: string, completedAt: Date): Promise<JobRecord> {
    const job = this.rows.get(id);
    if (!job) throw new Error(`job ${id} not found`);
    const next = {
      ...job,
      status: "failed" as const,
      error,
      completedAt: completedAt.toISOString(),
      updatedAt: completedAt.toISOString(),
    };
    this.rows.set(id, next);
    return next;
  }
}
