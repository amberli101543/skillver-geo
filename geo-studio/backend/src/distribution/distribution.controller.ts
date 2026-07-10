import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
  BadGatewayException,
} from "@nestjs/common";
import {
  CreateDistributionTaskDto,
  CreatePublishRecordDto,
  UpdateDistributionTaskDto,
} from "./dto/distribution.dto";
import {
  BrandNotFoundForDistributionError,
  ContentDraftNotFoundError,
  DistributionService,
  DistributionTaskConflictError,
  DistributionTaskNotExecutableError,
  DistributionTaskNotFoundError,
  DistributionValidationError,
  MatrixCellNotFoundError,
  PublishConnectorError,
  SourceNotFoundError,
} from "./distribution.service";
import { JobService } from "../worker/job.service";
import { type JobAcceptedResponse } from "../worker/job.types";
import { type DistributionTask } from "./distribution-task";
import { type PublishRecord } from "./publish-record";

@Controller("brands/:brandId")
export class DistributionController {
  constructor(
    private readonly distribution: DistributionService,
    private readonly jobs: JobService,
  ) {}

  @Get("distribution-tasks")
  async listTasks(@Param("brandId") brandId: string): Promise<DistributionTask[]> {
    return this.handle(() => this.distribution.listTasks(brandId));
  }

  @Post("distribution-tasks")
  async createTask(
    @Param("brandId") brandId: string,
    @Body() dto: CreateDistributionTaskDto,
  ): Promise<DistributionTask> {
    return this.handle(() =>
      this.distribution.createTask(brandId, {
        contentDraftId: dto.contentDraftId,
        sourceId: dto.sourceId,
        priority: dto.priority ?? 0,
      }),
    );
  }

  @Patch("distribution-tasks/:taskId")
  async updateTask(
    @Param("brandId") brandId: string,
    @Param("taskId") taskId: string,
    @Body() dto: UpdateDistributionTaskDto,
  ): Promise<DistributionTask> {
    return this.handle(() =>
      this.distribution.updateTask(brandId, taskId, {
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      }),
    );
  }

  @Delete("distribution-tasks/:taskId")
  async removeTask(
    @Param("brandId") brandId: string,
    @Param("taskId") taskId: string,
  ): Promise<{ deleted: true }> {
    await this.handle(() => this.distribution.removeTask(brandId, taskId));
    return { deleted: true };
  }

  @Get("publish-records")
  async listPublishRecords(@Param("brandId") brandId: string): Promise<PublishRecord[]> {
    return this.handle(() => this.distribution.listPublishRecords(brandId));
  }

  @Get("distribution-impact")
  async getDistributionImpact(@Param("brandId") brandId: string) {
    return this.handle(() => this.distribution.getDistributionImpact(brandId));
  }

  @Post("publish-records")
  async createPublishRecord(
    @Param("brandId") brandId: string,
    @Body() dto: CreatePublishRecordDto,
  ): Promise<PublishRecord> {
    return this.handle(() =>
      this.distribution.recordPublish(brandId, {
        contentDraftId: dto.contentDraftId,
        channel: dto.channel,
        ...(dto.sourceId !== undefined ? { sourceId: dto.sourceId } : {}),
        ...(dto.distributionTaskId !== undefined ? { distributionTaskId: dto.distributionTaskId } : {}),
        ...(dto.externalUrl !== undefined ? { externalUrl: dto.externalUrl } : {}),
        ...(dto.publishedAt !== undefined ? { publishedAt: dto.publishedAt } : {}),
      }),
    );
  }

  @Post("distribution-tasks/:taskId/execute")
  @HttpCode(HttpStatus.ACCEPTED)
  async executeTask(
    @Param("brandId") brandId: string,
    @Param("taskId") taskId: string,
  ): Promise<JobAcceptedResponse> {
    return this.handle(async () => {
      await this.distribution.validateExecutable(brandId, taskId);
      return this.jobs.enqueueDistributionExecute(brandId, taskId);
    });
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (
        err instanceof BrandNotFoundForDistributionError ||
        err instanceof DistributionTaskNotFoundError ||
        err instanceof ContentDraftNotFoundError ||
        err instanceof SourceNotFoundError ||
        err instanceof MatrixCellNotFoundError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof DistributionTaskNotExecutableError) {
        throw new UnprocessableEntityException(err.message);
      }
      if (err instanceof PublishConnectorError) {
        throw new BadGatewayException(err.message);
      }
      if (err instanceof DistributionValidationError) {
        throw new BadRequestException(err.errors);
      }
      if (err instanceof DistributionTaskConflictError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
