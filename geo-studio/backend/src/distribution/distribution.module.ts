import { Module, forwardRef } from "@nestjs/common";
import { BrandModule } from "../brand/brand.module";
import { ContentModule } from "../content/content.module";
import { MatrixModule } from "../matrix/matrix.module";
import { MetricsModule } from "../metrics/metrics.module";
import { JobsModule } from "../worker/jobs.module";
import { DistributionController } from "./distribution.controller";
import { DistributionRepository, PrismaDistributionRepository } from "./distribution.repository";
import { DistributionService } from "./distribution.service";
import { SourceController } from "./source.controller";
import { SourceRepository, PrismaSourceRepository } from "./source.repository";
import { SourceService } from "./source.service";
import { PublishConnector } from "./publish-connector";
import {
  CmsApiPublishConnector,
  ExportPublishConnector,
  PublishRegistry,
  RegisteredPublishConnector,
} from "./publish-registry";
import { SourceBootstrapService } from "./source-bootstrap.service";

@Module({
  imports: [BrandModule, ContentModule, MatrixModule, MetricsModule, forwardRef(() => JobsModule)],
  controllers: [SourceController, DistributionController],
  providers: [
    SourceService,
    SourceBootstrapService,
    DistributionService,
    ExportPublishConnector,
    CmsApiPublishConnector,
    PublishRegistry,
    { provide: PublishConnector, useClass: RegisteredPublishConnector },
    { provide: SourceRepository, useClass: PrismaSourceRepository },
    { provide: DistributionRepository, useClass: PrismaDistributionRepository },
  ],
  exports: [SourceService, DistributionService, PublishRegistry],
})
export class DistributionModule {}
