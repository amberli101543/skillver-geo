import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Param, Post } from "@nestjs/common";
import { JobService } from "../worker/job.service";
import { type JobAcceptedResponse } from "../worker/job.types";
import { RunDiagnosticBatchDto } from "./dto/run-diagnostic-batch.dto";
import { BrandNotFoundError } from "./diagnostic-service";

@Controller("brands/:id/diagnostic-runs")
export class DiagnosticBatchController {
  constructor(private readonly jobs: JobService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async run(
    @Param("id") brandId: string,
    @Body() dto: RunDiagnosticBatchDto = {},
  ): Promise<JobAcceptedResponse> {
    try {
      return await this.jobs.enqueueDiagnosticBatch(brandId, {
        ...(dto.engineIds?.length ? { engineIds: dto.engineIds } : {}),
      });
    } catch (err) {
      if (err instanceof BrandNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
