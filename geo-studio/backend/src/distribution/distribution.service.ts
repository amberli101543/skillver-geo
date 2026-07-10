import { Injectable } from "@nestjs/common";
import { BrandService } from "../brand/brand-service";
import { ContentDraftNotFoundError, ContentDraftService } from "../content/content-draft.service";
import { MatrixCellNotFoundError, MatrixCellService } from "../matrix/matrix-cell.service";
import { DistributionRepository } from "./distribution.repository";
import {
  validateDistributionTaskInput,
  validateDistributionTaskUpdate,
  type DistributionTask,
  type DistributionTaskInput,
  type DistributionTaskUpdate,
  type ValidationError as TaskValidationError,
} from "./distribution-task";
import {
  normalizePublishRecordInput,
  validatePublishRecordInput,
  type PublishRecord,
  type PublishRecordInput,
  type ValidationError as PublishValidationError,
} from "./publish-record";
import {
  buildDistributionImpact,
  type DistributionImpactResponse,
} from "./distribution-impact";
import { MetricSnapshotRepository } from "../metrics/metric-types";
import {
  PublishConnector,
  PublishConnectorError,
  type ExportManuscript,
} from "./publish-connector";
import { SourceNotFoundError, SourceService } from "./source.service";

export interface ExecuteDistributionTaskResult {
  mode: "api" | "export";
  task: DistributionTask;
  publishRecord?: PublishRecord;
  export?: ExportManuscript;
}

export class BrandNotFoundForDistributionError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundForDistributionError";
  }
}

export class DistributionValidationError extends Error {
  constructor(public readonly errors: TaskValidationError[] | PublishValidationError[]) {
    super("distribution validation failed");
    this.name = "DistributionValidationError";
  }
}

export class DistributionTaskNotFoundError extends Error {
  constructor(public readonly taskId: string) {
    super(`distribution task ${taskId} not found`);
    this.name = "DistributionTaskNotFoundError";
  }
}

export class DistributionTaskConflictError extends Error {
  constructor() {
    super("distribution task already exists for this content and source");
    this.name = "DistributionTaskConflictError";
  }
}

export class DistributionTaskNotExecutableError extends Error {
  constructor(public readonly taskId: string) {
    super(`distribution task ${taskId} cannot be executed`);
    this.name = "DistributionTaskNotExecutableError";
  }
}

export { ContentDraftNotFoundError, MatrixCellNotFoundError, PublishConnectorError, SourceNotFoundError };

@Injectable()
export class DistributionService {
  constructor(
    private readonly brands: BrandService,
    private readonly drafts: ContentDraftService,
    private readonly cells: MatrixCellService,
    private readonly sources: SourceService,
    private readonly repo: DistributionRepository,
    private readonly publishConnector: PublishConnector,
    private readonly metrics: MetricSnapshotRepository,
  ) {}

  async listTasks(brandId: string): Promise<DistributionTask[]> {
    await this.requireBrand(brandId);
    return this.repo.listTasks(brandId);
  }

  async createTask(brandId: string, input: DistributionTaskInput): Promise<DistributionTask> {
    await this.requireBrand(brandId);
    const errors = validateDistributionTaskInput(input);
    if (errors.length > 0) {
      throw new DistributionValidationError(errors);
    }
    await this.requireDraft(brandId, input.contentDraftId);
    await this.sources.get(input.sourceId);
    try {
      return await this.repo.createTask(brandId, {
        contentDraftId: input.contentDraftId,
        sourceId: input.sourceId,
        priority: input.priority ?? 0,
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new DistributionTaskConflictError();
      }
      throw err;
    }
  }

  async updateTask(
    brandId: string,
    taskId: string,
    input: DistributionTaskUpdate,
  ): Promise<DistributionTask> {
    await this.requireBrand(brandId);
    const errors = validateDistributionTaskUpdate(input);
    if (errors.length > 0) {
      throw new DistributionValidationError(errors);
    }
    const updated = await this.repo.updateTask(brandId, taskId, input);
    if (!updated) {
      throw new DistributionTaskNotFoundError(taskId);
    }
    return updated;
  }

  async removeTask(brandId: string, taskId: string): Promise<void> {
    await this.requireBrand(brandId);
    const deleted = await this.repo.deleteTask(brandId, taskId);
    if (!deleted) {
      throw new DistributionTaskNotFoundError(taskId);
    }
  }

  async listPublishRecords(brandId: string): Promise<PublishRecord[]> {
    await this.requireBrand(brandId);
    return this.repo.listPublishRecords(brandId);
  }

  async getDistributionImpact(brandId: string): Promise<DistributionImpactResponse> {
    await this.requireBrand(brandId);
    const [records, snapshots] = await Promise.all([
      this.repo.listPublishRecords(brandId),
      this.metrics.listByBrand(brandId),
    ]);
    return buildDistributionImpact(brandId, records, snapshots);
  }

  async recordPublish(brandId: string, input: PublishRecordInput): Promise<PublishRecord> {
    await this.requireBrand(brandId);
    const errors = validatePublishRecordInput(input);
    if (errors.length > 0) {
      throw new DistributionValidationError(errors);
    }
    await this.requireDraft(brandId, input.contentDraftId);
    if (input.sourceId) {
      await this.sources.get(input.sourceId);
    }

    let taskId = input.distributionTaskId;
    if (taskId) {
      const task = await this.repo.findTask(brandId, taskId);
      if (!task) {
        throw new DistributionTaskNotFoundError(taskId);
      }
      if (task.contentDraftId !== input.contentDraftId) {
        throw new DistributionValidationError([
          { field: "distributionTaskId", message: "task does not match contentDraftId" },
        ]);
      }
    }

    const normalized = normalizePublishRecordInput(input);
    const record = await this.repo.createPublishRecord(brandId, normalized);

    if (taskId) {
      await this.repo.updateTask(brandId, taskId, { status: "completed" });
    } else if (input.sourceId) {
      const tasks = await this.repo.listTasks(brandId);
      const matching = tasks.find(
        (t) =>
          t.contentDraftId === input.contentDraftId &&
          t.sourceId === input.sourceId &&
          t.status !== "completed",
      );
      if (matching) {
        await this.repo.updateTask(brandId, matching.id, { status: "completed" });
      }
    }

    return record;
  }

  async validateExecutable(brandId: string, taskId: string): Promise<DistributionTask> {
    await this.requireBrand(brandId);
    const task = await this.repo.findTask(brandId, taskId);
    if (!task) {
      throw new DistributionTaskNotFoundError(taskId);
    }
    if (task.status === "completed" || task.status === "cancelled") {
      throw new DistributionTaskNotExecutableError(taskId);
    }
    return task;
  }

  async executeTask(brandId: string, taskId: string): Promise<ExecuteDistributionTaskResult> {
    const task = await this.validateExecutable(brandId, taskId);

    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundForDistributionError(brandId);
    }
    const draft = await this.drafts.getDraft(brandId, task.contentDraftId);
    const source = await this.sources.get(task.sourceId);
    const cell = await this.cells.getCell(brandId, draft.cellId);
    if (!cell) {
      throw new MatrixCellNotFoundError(draft.cellId);
    }

    if (task.status === "pending") {
      await this.repo.updateTask(brandId, taskId, { status: "in_progress" });
    }

    try {
      const result = await this.publishConnector.publish({ brand, cell, draft, source });
      if (result.mode === "api") {
        const publishRecord = await this.recordPublish(brandId, {
          contentDraftId: task.contentDraftId,
          sourceId: task.sourceId,
          distributionTaskId: taskId,
          channel: result.channel,
          externalUrl: result.externalUrl,
          publishedAt: result.publishedAt,
        });
        const updatedTask = await this.repo.findTask(brandId, taskId);
        return {
          mode: "api",
          publishRecord,
          task: updatedTask ?? task,
        };
      }

      const updatedTask = await this.repo.findTask(brandId, taskId);
      return {
        mode: "export",
        export: result.export,
        task: updatedTask ?? task,
      };
    } catch (err) {
      await this.repo.updateTask(brandId, taskId, { status: "failed" });
      throw err;
    }
  }

  private async requireBrand(brandId: string): Promise<void> {
    if (!(await this.brands.get(brandId))) {
      throw new BrandNotFoundForDistributionError(brandId);
    }
  }

  private async requireDraft(brandId: string, draftId: string): Promise<void> {
    try {
      await this.drafts.getDraft(brandId, draftId);
    } catch (err) {
      if (err instanceof ContentDraftNotFoundError) {
        throw err;
      }
      throw err;
    }
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}
