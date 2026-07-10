import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { type Assertion, type AssertionInput } from "./assertion";
import { type Competitor, type CompetitorInput } from "./competitor";

export abstract class BrandEntityRepository {
  abstract listAssertions(brandId: string): Promise<Assertion[]>;
  abstract createAssertion(brandId: string, input: Omit<AssertionInput, "brandId">): Promise<Assertion>;
  abstract deleteAssertion(brandId: string, assertionId: string): Promise<boolean>;

  abstract listCompetitors(brandId: string): Promise<Competitor[]>;
  abstract createCompetitor(brandId: string, input: Omit<CompetitorInput, "brandId">): Promise<Competitor>;
  abstract deleteCompetitor(brandId: string, competitorId: string): Promise<boolean>;
}

@Injectable()
export class PrismaBrandEntityRepository extends BrandEntityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listAssertions(brandId: string): Promise<Assertion[]> {
    const rows = await this.prisma.assertion.findMany({
      where: { brandId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      brandId: row.brandId,
      text: row.text,
      evidence: row.evidence ?? undefined,
    }));
  }

  async createAssertion(
    brandId: string,
    input: Omit<AssertionInput, "brandId">,
  ): Promise<Assertion> {
    const row = await this.prisma.assertion.create({
      data: {
        brandId,
        text: input.text,
        evidence: input.evidence ?? null,
      },
    });
    return {
      id: row.id,
      brandId: row.brandId,
      text: row.text,
      evidence: row.evidence ?? undefined,
    };
  }

  async deleteAssertion(brandId: string, assertionId: string): Promise<boolean> {
    const result = await this.prisma.assertion.deleteMany({
      where: { id: assertionId, brandId },
    });
    return result.count > 0;
  }

  async listCompetitors(brandId: string): Promise<Competitor[]> {
    const rows = await this.prisma.competitor.findMany({
      where: { brandId },
      orderBy: { name: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      brandId: row.brandId,
      name: row.name,
    }));
  }

  async createCompetitor(
    brandId: string,
    input: Omit<CompetitorInput, "brandId">,
  ): Promise<Competitor> {
    const row = await this.prisma.competitor.create({
      data: { brandId, name: input.name },
    });
    return { id: row.id, brandId: row.brandId, name: row.name };
  }

  async deleteCompetitor(brandId: string, competitorId: string): Promise<boolean> {
    const result = await this.prisma.competitor.deleteMany({
      where: { id: competitorId, brandId },
    });
    return result.count > 0;
  }
}
