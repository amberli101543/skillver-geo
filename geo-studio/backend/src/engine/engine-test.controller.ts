import { Controller, HttpCode, HttpStatus, NotFoundException, Param, Post, Body } from "@nestjs/common";
import { BrandNotFoundError } from "../diagnostics/diagnostic-service";
import { JobService } from "../worker/job.service";
import { type JobAcceptedResponse } from "../worker/job.types";
import { RunEngineTestDto } from "./dto/run-engine-test.dto";

@Controller("brands/:id/engine-tests")
export class EngineTestController {
  constructor(private readonly jobs: JobService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async run(@Param("id") brandId: string, @Body() dto: RunEngineTestDto): Promise<JobAcceptedResponse> {
    try {
      return await this.jobs.enqueueEngineTest(brandId, dto.question, dto.engineId);
    } catch (err) {
      if (err instanceof BrandNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
