import { Injectable, Optional } from "@nestjs/common";
import { KnowledgeAiFacade } from "../ai/knowledge.facade";
import { type Brand, type BrandInput, type ValidationError, validateBrand } from "./brand";
import { BrandRepository } from "./brand-repository";

export class BrandValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("brand validation failed");
    this.name = "BrandValidationError";
  }
}

export class BrandNotFoundError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundError";
  }
}

@Injectable()
export class BrandService {
  constructor(
    private readonly repo: BrandRepository,
    @Optional() private readonly knowledge?: KnowledgeAiFacade,
  ) {}

  async create(input: BrandInput): Promise<Brand> {
    const errors = validateBrand(input);
    if (errors.length > 0) {
      throw new BrandValidationError(errors);
    }
    const brand = await this.repo.create(input);
    await this.refreshBrandProfileIndex(brand);
    return brand;
  }

  async get(id: string): Promise<Brand | undefined> {
    const brand = await this.repo.findById(id);
    return brand ?? undefined;
  }

  async list(): Promise<Brand[]> {
    return this.repo.list();
  }

  async update(id: string, patch: Partial<BrandInput>): Promise<Brand> {
    const existing = await this.get(id);
    if (!existing) {
      throw new BrandNotFoundError(id);
    }
    const merged: BrandInput = {
      name: patch.name ?? existing.name,
      definition: patch.definition ?? existing.definition,
      positioning: patch.positioning !== undefined ? patch.positioning : existing.positioning,
    };
    const errors = validateBrand(merged);
    if (errors.length > 0) {
      throw new BrandValidationError(errors);
    }
    const updated = await this.repo.update(id, merged);
    if (!updated) {
      throw new BrandNotFoundError(id);
    }
    await this.refreshBrandProfileIndex(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new BrandNotFoundError(id);
    }
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new BrandNotFoundError(id);
    }
  }

  private async refreshBrandProfileIndex(brand: Brand): Promise<void> {
    if (!this.knowledge) {
      return;
    }
    await this.knowledge.syncBrandProfile(brand.id, {
      definition: brand.definition,
      positioning: brand.positioning,
    });
  }
}
