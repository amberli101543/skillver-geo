import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaService } from "./prisma/prisma.service";
import { processRole } from "./process-role";
import { JobQueueService } from "./worker/job-queue.service";
import { logJobEvent } from "./worker/job-log";

export async function assertSchemaReady(prisma: PrismaService): Promise<void> {
  const staleColumns = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND table_name IN ('brands', 'diagnostic_runs', 'metric_snapshots')
  `;
  if (staleColumns.length > 0) {
    const tables = staleColumns.map((row) => row.table_name).join(", ");
    throw new Error(
      `Database schema is outdated (${tables} still contain tenant_id). Run "npx prisma migrate deploy".`,
    );
  }
}

export function applyCommonAppConfig(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const isProd = process.env.NODE_ENV === "production";
  app.enableCors({
    origin: isProd ? (process.env.WEB_ORIGIN ?? "http://localhost:5173") : true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}

export function logProcessStartup(label: string, port?: number): void {
  const logger = new Logger(label);
  if (port === undefined) {
    logger.log(`started (PROCESS_ROLE=${processRole()}, http=false)`);
    return;
  }
  logger.log(`listening on :${port} (PROCESS_ROLE=${processRole()})`);
}

export function logWorkerReady(queue: JobQueueService): void {
  const logger = new Logger("WorkerProcess");
  logJobEvent(logger, "worker.ready", {
    jobId: "-",
    mode: queue.mode,
  });
}
