import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DistributionTask,
  type DistributionTaskInput,
  type DistributionTaskStatus,
  type DistributionTaskUpdate,
} from "./distribution-task";
import { type PublishRecord } from "./publish-record";

export abstract class DistributionRepository {
  abstract listTasks(brandId: string): Promise<DistributionTask[]>;
  abstract findTask(brandId: string, taskId: string): Promise<DistributionTask | null>;
  abstract createTask(brandId: string, input: DistributionTaskInput): Promise<DistributionTask>;
  abstract updateTask(
    brandId: string,
    taskId: string,
    input: DistributionTaskUpdate,
  ): Promise<DistributionTask | null>;
  abstract deleteTask(brandId: string, taskId: string): Promise<boolean>;

  abstract listPublishRecords(brandId: string): Promise<PublishRecord[]>;
  abstract createPublishRecord(
    brandId: string,
    input: {
      contentDraftId: string;
      sourceId?: string;
      distributionTaskId?: string;
      channel: string;
      externalUrl?: string;
      publishedAt: Date;
    },
  ): Promise<PublishRecord>;
}

function toTask(row: {
  id: string;
  brandId: string;
  contentDraftId: string;
  sourceId: string;
  priority: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): DistributionTask {
  return {
    id: row.id,
    brandId: row.brandId,
    contentDraftId: row.contentDraftId,
    sourceId: row.sourceId,
    priority: row.priority,
    status: row.status as DistributionTaskStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPublishRecord(row: {
  id: string;
  brandId: string;
  contentDraftId: string;
  sourceId: string | null;
  distributionTaskId: string | null;
  channel: string;
  externalUrl: string | null;
  publishedAt: Date;
  createdAt: Date;
}): PublishRecord {
  return {
    id: row.id,
    brandId: row.brandId,
    contentDraftId: row.contentDraftId,
    ...(row.sourceId ? { sourceId: row.sourceId } : {}),
    ...(row.distributionTaskId ? { distributionTaskId: row.distributionTaskId } : {}),
    channel: row.channel,
    ...(row.externalUrl ? { externalUrl: row.externalUrl } : {}),
    publishedAt: row.publishedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class PrismaDistributionRepository extends DistributionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listTasks(brandId: string): Promise<DistributionTask[]> {
    const rows = await this.prisma.distributionTask.findMany({
      where: { brandId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toTask);
  }

  async findTask(brandId: string, taskId: string): Promise<DistributionTask | null> {
    const row = await this.prisma.distributionTask.findFirst({ where: { id: taskId, brandId } });
    return row ? toTask(row) : null;
  }

  async createTask(brandId: string, input: DistributionTaskInput): Promise<DistributionTask> {
    const row = await this.prisma.distributionTask.create({
      data: {
        brandId,
        contentDraftId: input.contentDraftId,
        sourceId: input.sourceId,
        priority: input.priority,
        status: "pending",
      },
    });
    return toTask(row);
  }

  async updateTask(
    brandId: string,
    taskId: string,
    input: DistributionTaskUpdate,
  ): Promise<DistributionTask | null> {
    const existing = await this.findTask(brandId, taskId);
    if (!existing) return null;
    const row = await this.prisma.distributionTask.update({
      where: { id: taskId },
      data: {
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return toTask(row);
  }

  async deleteTask(brandId: string, taskId: string): Promise<boolean> {
    const result = await this.prisma.distributionTask.deleteMany({ where: { id: taskId, brandId } });
    return result.count > 0;
  }

  async listPublishRecords(brandId: string): Promise<PublishRecord[]> {
    const rows = await this.prisma.publishRecord.findMany({
      where: { brandId },
      orderBy: { publishedAt: "desc" },
    });
    return rows.map(toPublishRecord);
  }

  async createPublishRecord(
    brandId: string,
    input: {
      contentDraftId: string;
      sourceId?: string;
      distributionTaskId?: string;
      channel: string;
      externalUrl?: string;
      publishedAt: Date;
    },
  ): Promise<PublishRecord> {
    const row = await this.prisma.publishRecord.create({
      data: {
        brandId,
        contentDraftId: input.contentDraftId,
        sourceId: input.sourceId ?? null,
        distributionTaskId: input.distributionTaskId ?? null,
        channel: input.channel,
        externalUrl: input.externalUrl ?? null,
        publishedAt: input.publishedAt,
      },
    });
    return toPublishRecord(row);
  }
}
