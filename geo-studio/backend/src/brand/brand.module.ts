import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { BrandController } from "./brand.controller";
import { BrandEntityController } from "./brand-entity.controller";
import { BrandService } from "./brand-service";
import { BrandEntityService } from "./brand-entity.service";
import { BrandRepository, PrismaBrandRepository } from "./brand-repository";
import { BrandEntityRepository, PrismaBrandEntityRepository } from "./brand-entity.repository";

@Module({
  imports: [AiModule],
  controllers: [BrandController, BrandEntityController],
  providers: [
    BrandService,
    BrandEntityService,
    { provide: BrandRepository, useClass: PrismaBrandRepository },
    { provide: BrandEntityRepository, useClass: PrismaBrandEntityRepository },
  ],
  exports: [BrandService, BrandEntityService],
})
export class BrandModule {}
