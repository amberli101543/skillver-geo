import { Injectable, Logger } from "@nestjs/common";
import { type Brand } from "../brand/brand";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandService } from "../brand/brand-service";
import { EngineTestRunService } from "../engine/engine-test-run.service";
import { type MatrixCell } from "../matrix/matrix-cell";
import { MatrixCellNotFoundError, MatrixCellService } from "../matrix/matrix-cell.service";
import { ContentDraftRepository } from "./content-draft.repository";
import { ContentGenerator } from "./content-generator";
import {
  buildContentVerification,
  buildVerificationQuestion,
} from "./content-verification";
import {
  validateContentDraftUpdate,
  type ContentDraft,
  type ContentDraftUpdate,
  type ValidationError,
} from "./content-draft";

export class ContentDraftValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("content draft validation failed");
    this.name = "ContentDraftValidationError";
  }
}

export class BrandNotFoundForContentError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundForContentError";
  }
}

export class ContentDraftNotFoundError extends Error {
  constructor(public readonly draftId: string) {
    super(`content draft ${draftId} not found`);
    this.name = "ContentDraftNotFoundError";
  }
}

export { MatrixCellNotFoundError };

@Injectable()
export class ContentDraftService {
  private readonly logger = new Logger(ContentDraftService.name);

  constructor(
    private readonly brands: BrandService,
    private readonly entities: BrandEntityService,
    private readonly cells: MatrixCellService,
    private readonly repo: ContentDraftRepository,
    private readonly generator: ContentGenerator,
    private readonly engineTests: EngineTestRunService,
  ) {}

  async listByBrand(brandId: string): Promise<ContentDraft[]> {
    await this.requireBrand(brandId);
    return this.repo.listByBrand(brandId);
  }

  async listByCell(brandId: string, cellId: string): Promise<ContentDraft[]> {
    await this.requireCell(brandId, cellId);
    return this.repo.listByCell(cellId);
  }

  async getDraft(brandId: string, draftId: string): Promise<ContentDraft> {
    await this.requireBrand(brandId);
    const draft = await this.repo.findById(brandId, draftId);
    if (!draft) {
      throw new ContentDraftNotFoundError(draftId);
    }
    return draft;
  }

  async generateDraft(brandId: string, cellId: string): Promise<ContentDraft> {
    await this.ensureGenerateReady(brandId, cellId);
    const brand = await this.requireBrand(brandId);
    const cell = await this.requireCell(brandId, cellId);
    const assertions = (await this.entities.listAssertions(brandId)).map((a) => a.text);
    const generated = await this.generator.generate({ brand, cell, assertions });
    const draft = await this.repo.createNextVersion(cellId, generated.body, generated.ragSnippets);
    return this.verifyDraftInternal(brandId, draft, brand, cell, { swallowFailure: true });
  }

  async verifyDraft(brandId: string, draftId: string, engineId?: string): Promise<ContentDraft> {
    const brand = await this.requireBrand(brandId);
    const draft = await this.getDraft(brandId, draftId);
    const cell = await this.requireCell(brandId, draft.cellId);
    return this.verifyDraftInternal(brandId, draft, brand, cell, {
      engineId,
      swallowFailure: false,
    });
  }

  async ensureGenerateReady(brandId: string, cellId: string): Promise<void> {
    await this.requireBrand(brandId);
    await this.requireCell(brandId, cellId);
  }

  async updateDraft(
    brandId: string,
    draftId: string,
    input: ContentDraftUpdate,
  ): Promise<ContentDraft> {
    await this.requireBrand(brandId);
    const errors = validateContentDraftUpdate(input);
    if (errors.length > 0) {
      throw new ContentDraftValidationError(errors);
    }
    const updated = await this.repo.update(brandId, draftId, {
      ...(input.body !== undefined ? { body: input.body.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });
    if (!updated) {
      throw new ContentDraftNotFoundError(draftId);
    }
    return updated;
  }

  async removeDraft(brandId: string, draftId: string): Promise<void> {
    await this.requireBrand(brandId);
    const deleted = await this.repo.delete(brandId, draftId);
    if (!deleted) {
      throw new ContentDraftNotFoundError(draftId);
    }
  }

  private async verifyDraftInternal(
    brandId: string,
    draft: ContentDraft,
    brand: Brand,
    cell: MatrixCell,
    options: { engineId?: string; swallowFailure: boolean } = { swallowFailure: true },
  ): Promise<ContentDraft> {
    const { engineId, swallowFailure } = options;
    try {
      const question = buildVerificationQuestion(brand, cell);
      const engineResult = await this.engineTests.runForBrand(brandId, question, engineId);
      const verification = buildContentVerification({
        brand,
        cell,
        draftBody: draft.body,
        engineResult,
      });
      const saved = await this.repo.saveVerification(brandId, draft.id, verification);
      return saved ?? { ...draft, verification };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`content verification failed for draft ${draft.id}: ${message}`);
      if (!swallowFailure) {
        throw err;
      }
      return draft;
    }
  }

  private async requireBrand(brandId: string) {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundForContentError(brandId);
    }
    return brand;
  }

  private async requireCell(brandId: string, cellId: string) {
    const cell = await this.cells.getCell(brandId, cellId);
    if (!cell) {
      throw new MatrixCellNotFoundError(cellId);
    }
    return cell;
  }
}
