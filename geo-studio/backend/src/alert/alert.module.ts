import { Module, forwardRef } from "@nestjs/common";
import { BrandModule } from "../brand/brand.module";
import { DiagnosticModule } from "../diagnostics/diagnostic.module";
import { DistributionModule } from "../distribution/distribution.module";
import { AlertController } from "./alert.controller";
import { AlertDispatcherService } from "./alert-dispatcher.service";
import { AlertRepository, PrismaAlertRepository } from "./alert.repository";
import { AlertService } from "./alert.service";

@Module({
  imports: [BrandModule, DistributionModule, forwardRef(() => DiagnosticModule)],
  controllers: [AlertController],
  providers: [AlertService, AlertDispatcherService, { provide: AlertRepository, useClass: PrismaAlertRepository }],
  exports: [AlertService],
})
export class AlertModule {}
