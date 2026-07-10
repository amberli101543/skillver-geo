import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { JobService } from "./job.service";
import { type JobRecord, type JobStats } from "./job.types";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobs: JobService) {}

  @Get("stats")
  async stats(): Promise<JobStats> {
    return this.jobs.getStats();
  }

  @Get(":jobId")
  async get(@Param("jobId") jobId: string): Promise<JobRecord> {
    try {
      return await this.jobs.getJob(jobId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw err;
    }
  }
}
