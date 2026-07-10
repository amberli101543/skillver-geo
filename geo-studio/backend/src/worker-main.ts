import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { applyCommonAppConfig, assertSchemaReady, logProcessStartup, logWorkerReady } from "./bootstrap";
import { PrismaService } from "./prisma/prisma.service";
import { JobQueueService } from "./worker/job-queue.service";
import { WorkerAppModule } from "./worker-app.module";

async function bootstrap(): Promise<void> {
  if (!process.env.PROCESS_ROLE) {
    process.env.PROCESS_ROLE = "worker";
  }

  const app = await NestFactory.createApplicationContext(WorkerAppModule);
  await assertSchemaReady(app.get(PrismaService));
  logProcessStartup("WorkerProcess");
  logWorkerReady(app.get(JobQueueService));
}

void bootstrap();
