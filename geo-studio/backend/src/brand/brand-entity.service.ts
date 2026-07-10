import { Injectable, Optional } from "@nestjs/common";
import { KnowledgeAiFacade } from "../ai/knowledge.facade";
import { BrandService } from "./brand-service";
import { BrandEntityRepository } from "./brand-entity.repository";
import {
  validateAssertion,
  type Assertion,
  type ValidationError as AssertionValidationError,
} from "./assertion";
import {
  validateCompetitor,
  type Competitor,
  type ValidationError as CompetitorValidationError,
} from "./competitor";

export class BrandEntityValidationError extends Error {
  constructor(public readonly errors: AssertionValidationError[] | CompetitorValidationError[]) {
    super("brand entity validation failed");
    this.name = "BrandEntityValidationError";
  }
}

export class BrandNotFoundForEntityError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundForEntityError";
  }
}

export class BrandEntityNotFoundError extends Error {
  constructor(public readonly entity: "assertion" | "competitor", public readonly id: string) {
    super(`${entity} ${id} not found`);
    this.name = "BrandEntityNotFoundError";
  }
}

@Injectable()
export class BrandEntityService {
  constructor(
    private readonly brands: BrandService,
    private readonly repo: BrandEntityRepository,
    @Optional() private readonly knowledge?: KnowledgeAiFacade,
  ) {}

  async listAssertions(brandId: string): Promise<Assertion[]> {
    await this.requireBrand(brandId);
    return this.repo.listAssertions(brandId);
  }

  async addAssertion(
    brandId: string,
    input: { text: string; evidence?: string },
  ): Promise<Assertion> {
    await this.requireBrand(brandId);
    const errors = validateAssertion({ brandId, text: input.text, evidence: input.evidence });
    if (errors.length > 0) {
      throw new BrandEntityValidationError(errors);
    }
    const created = await this.repo.createAssertion(brandId, {
      text: input.text.trim(),
      ...(input.evidence !== undefined ? { evidence: input.evidence.trim() } : {}),
    });
    await this.refreshAssertionIndex(brandId);
    return created;
  }

  async removeAssertion(brandId: string, assertionId: string): Promise<void> {
    await this.requireBrand(brandId);
    const deleted = await this.repo.deleteAssertion(brandId, assertionId);
    if (!deleted) {
      throw new BrandEntityNotFoundError("assertion", assertionId);
    }
    await this.refreshAssertionIndex(brandId);
  }

  async listCompetitors(brandId: string): Promise<Competitor[]> {
    await this.requireBrand(brandId);
    return this.repo.listCompetitors(brandId);
  }

  async listCompetitorNames(brandId: string): Promise<string[]> {
    const competitors = await this.listCompetitors(brandId);
    return competitors.map((c) => c.name);
  }

  async addCompetitor(brandId: string, input: { name: string }): Promise<Competitor> {
    await this.requireBrand(brandId);
    const errors = validateCompetitor({ brandId, name: input.name });
    if (errors.length > 0) {
      throw new BrandEntityValidationError(errors);
    }
    return this.repo.createCompetitor(brandId, { name: input.name.trim() });
  }

  async removeCompetitor(brandId: string, competitorId: string): Promise<void> {
    await this.requireBrand(brandId);
    const deleted = await this.repo.deleteCompetitor(brandId, competitorId);
    if (!deleted) {
      throw new BrandEntityNotFoundError("competitor", competitorId);
    }
  }

  private async requireBrand(brandId: string): Promise<void> {
    if (!(await this.brands.get(brandId))) {
      throw new BrandNotFoundForEntityError(brandId);
    }
  }

  private async refreshAssertionIndex(brandId: string): Promise<void> {
    if (!this.knowledge) {
      return;
    }
    const assertions = await this.repo.listAssertions(brandId);
    await this.knowledge.syncAssertions(
      brandId,
      assertions.map((assertion) => assertion.text),
    );
  }
}
