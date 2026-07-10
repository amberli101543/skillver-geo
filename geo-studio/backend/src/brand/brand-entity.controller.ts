import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import {
  BrandEntityService,
  BrandEntityValidationError,
  BrandNotFoundForEntityError,
  BrandEntityNotFoundError,
} from "./brand-entity.service";
import { type Assertion } from "./assertion";
import { type Competitor } from "./competitor";
import { CreateAssertionDto } from "./dto/create-assertion.dto";
import { CreateCompetitorDto } from "./dto/create-competitor.dto";

@Controller("brands/:brandId")
export class BrandEntityController {
  constructor(private readonly entities: BrandEntityService) {}

  @Get("assertions")
  async listAssertions(@Param("brandId") brandId: string): Promise<Assertion[]> {
    return this.handle(() => this.entities.listAssertions(brandId));
  }

  @Post("assertions")
  async addAssertion(
    @Param("brandId") brandId: string,
    @Body() dto: CreateAssertionDto,
  ): Promise<Assertion> {
    return this.handle(() =>
      this.entities.addAssertion(brandId, {
        text: dto.text,
        ...(dto.evidence !== undefined ? { evidence: dto.evidence } : {}),
      }),
    );
  }

  @Delete("assertions/:assertionId")
  async removeAssertion(
    @Param("brandId") brandId: string,
    @Param("assertionId") assertionId: string,
  ): Promise<{ deleted: true }> {
    await this.handle(() => this.entities.removeAssertion(brandId, assertionId));
    return { deleted: true };
  }

  @Get("competitors")
  async listCompetitors(@Param("brandId") brandId: string): Promise<Competitor[]> {
    return this.handle(() => this.entities.listCompetitors(brandId));
  }

  @Post("competitors")
  async addCompetitor(
    @Param("brandId") brandId: string,
    @Body() dto: CreateCompetitorDto,
  ): Promise<Competitor> {
    return this.handle(() => this.entities.addCompetitor(brandId, { name: dto.name }));
  }

  @Delete("competitors/:competitorId")
  async removeCompetitor(
    @Param("brandId") brandId: string,
    @Param("competitorId") competitorId: string,
  ): Promise<{ deleted: true }> {
    await this.handle(() => this.entities.removeCompetitor(brandId, competitorId));
    return { deleted: true };
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof BrandNotFoundForEntityError || err instanceof BrandEntityNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof BrandEntityValidationError) {
        throw new BadRequestException(err.errors);
      }
      throw err;
    }
  }
}
