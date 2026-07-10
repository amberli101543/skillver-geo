import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import {
  BrandNotFoundError,
  DiagnosticService,
  type DiagnosticQuestion,
} from "./diagnostic-service";

@Controller("brands/:id/questions")
export class DiagnosticController {
  constructor(private readonly diagnostics: DiagnosticService) {}

  @Get()
  async list(@Param("id") brandId: string): Promise<DiagnosticQuestion[]> {
    try {
      return await this.diagnostics.buildQuestionSet(brandId);
    } catch (err) {
      if (err instanceof BrandNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
