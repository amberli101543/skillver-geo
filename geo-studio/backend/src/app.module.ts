import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { BrandModule } from "./brand/brand.module";
import { DiagnosticModule } from "./diagnostics/diagnostic.module";
import { EngineModule } from "./engine/engine.module";
import { MetricsModule } from "./metrics/metrics.module";
import { WorkerModule } from "./worker/worker.module";
import { MatrixModule } from "./matrix/matrix.module";
import { ContentModule } from "./content/content.module";
import { DistributionModule } from "./distribution/distribution.module";
import { AlertModule } from "./alert/alert.module";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ApiKeyGuard } from "./common/api-key.guard";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    BrandModule,
    DiagnosticModule,
    EngineModule,
    MetricsModule,
    WorkerModule,
    MatrixModule,
    ContentModule,
    DistributionModule,
    AlertModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
