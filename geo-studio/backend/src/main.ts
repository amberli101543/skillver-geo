import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { applyCommonAppConfig, assertSchemaReady, logProcessStartup } from "./bootstrap";
import { PrismaService } from "./prisma/prisma.service";

async function bootstrap(): Promise<void> {
  if (!process.env.PROCESS_ROLE) {
    process.env.PROCESS_ROLE = "all";
  }

  const app = await NestFactory.create(AppModule);
  applyCommonAppConfig(app);
  await assertSchemaReady(app.get(PrismaService));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logProcessStartup("ApiProcess", port);
}

void bootstrap();
