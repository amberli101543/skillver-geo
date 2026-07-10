import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { type SourceInput } from "./source";
import { SourceService } from "./source.service";

const DEFAULT_SOURCES: SourceInput[] = [
  { name: "官网博客", tier: "owned", weight: 80, channelType: "manual" },
  { name: "知乎专栏", tier: "community", weight: 60, channelType: "manual" },
  { name: "行业媒体", tier: "professional", weight: 50, channelType: "export" },
];

@Injectable()
export class SourceBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SourceBootstrapService.name);

  constructor(private readonly sources: SourceService) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.sources.list();
    if (existing.length > 0) {
      return;
    }
    for (const source of DEFAULT_SOURCES) {
      await this.sources.create(source);
    }
    this.logger.log(`Seeded ${DEFAULT_SOURCES.length} default sources`);
  }
}
