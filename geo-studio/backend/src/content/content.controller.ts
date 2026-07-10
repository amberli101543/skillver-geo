import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { JobService } from "../worker/job.service";
import { type JobAcceptedResponse } from "../worker/job.types";
import { UpdateContentDraftDto } from "./dto/update-content-draft.dto";
import {
  BrandNotFoundForContentError,
  ContentDraftNotFoundError,
  ContentDraftService,
  ContentDraftValidationError,
  MatrixCellNotFoundError,
} from "./content-draft.service";
import { type ContentDraft } from "./content-draft";

@Controller("brands/:brandId")
export class ContentController {
  constructor(
    private readonly drafts: ContentDraftService,
    private readonly jobs: JobService,
  ) {}

  @Get("content-drafts")
  async listByBrand(@Param("brandId") brandId: string): Promise<ContentDraft[]> {
    return this.handle(() => this.drafts.listByBrand(brandId));
  }

  @Get("matrix-cells/:cellId/content-drafts")
  async listByCell(
    @Param("brandId") brandId: string,
    @Param("cellId") cellId: string,
  ): Promise<ContentDraft[]> {
    return this.handle(() => this.drafts.listByCell(brandId, cellId));
  }

  @Get("content-drafts/:draftId")
  async get(
    @Param("brandId") brandId: string,
    @Param("draftId") draftId: string,
  ): Promise<ContentDraft> {
    return this.handle(() => this.drafts.getDraft(brandId, draftId));
  }

  @Post("matrix-cells/:cellId/content-drafts/generate")
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Param("brandId") brandId: string,
    @Param("cellId") cellId: string,
  ): Promise<JobAcceptedResponse> {
    return this.handle(async () => {
      await this.drafts.ensureGenerateReady(brandId, cellId);
      return this.jobs.enqueueContentGenerate(brandId, cellId);
    });
  }

  @Post("content-drafts/:draftId/verify")
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param("brandId") brandId: string,
    @Param("draftId") draftId: string,
  ): Promise<ContentDraft> {
    return this.handle(() => this.drafts.verifyDraft(brandId, draftId));
  }

  @Patch("content-drafts/:draftId")
  async update(
    @Param("brandId") brandId: string,
    @Param("draftId") draftId: string,
    @Body() dto: UpdateContentDraftDto,
  ): Promise<ContentDraft> {
    return this.handle(() =>
      this.drafts.updateDraft(brandId, draftId, {
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      }),
    );
  }

  @Delete("content-drafts/:draftId")
  async remove(
    @Param("brandId") brandId: string,
    @Param("draftId") draftId: string,
  ): Promise<{ deleted: true }> {
    await this.handle(() => this.drafts.removeDraft(brandId, draftId));
    return { deleted: true };
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (
        err instanceof BrandNotFoundForContentError ||
        err instanceof ContentDraftNotFoundError ||
        err instanceof MatrixCellNotFoundError
      ) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof ContentDraftValidationError) {
        throw new BadRequestException(err.errors);
      }
      throw err;
    }
  }
}
