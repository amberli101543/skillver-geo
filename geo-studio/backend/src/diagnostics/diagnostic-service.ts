import { Injectable } from "@nestjs/common";
import { BrandEntityService } from "../brand/brand-entity.service";
import { BrandService } from "../brand/brand-service";
import { generateQuestionSet, type GenerateOptions, type Question } from "./question";

export class BrandNotFoundError extends Error {
  constructor(public readonly brandId: string) {
    super(`brand ${brandId} not found`);
    this.name = "BrandNotFoundError";
  }
}

export interface DiagnosticQuestion extends Question {
  brandId: string;
}

function mergeUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.trim();
    if (!key || seen.has(key.toLowerCase())) {
      continue;
    }
    seen.add(key.toLowerCase());
    out.push(key);
  }
  return out;
}

@Injectable()
export class DiagnosticService {
  constructor(
    private readonly brands: BrandService,
    private readonly entities: BrandEntityService,
  ) {}

  async buildQuestionSet(
    brandId: string,
    opts: GenerateOptions = {},
  ): Promise<DiagnosticQuestion[]> {
    const brand = await this.brands.get(brandId);
    if (!brand) {
      throw new BrandNotFoundError(brandId);
    }
    const storedCompetitors = await this.entities.listCompetitorNames(brandId);
    const competitors = mergeUnique([...(opts.competitors ?? []), ...storedCompetitors]);
    return generateQuestionSet(brand, { ...opts, competitors }).map((q) => ({
      ...q,
      brandId: brand.id,
    }));
  }
}
