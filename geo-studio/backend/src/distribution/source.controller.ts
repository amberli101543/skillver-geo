import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { CreateSourceDto } from "./dto/create-source.dto";
import { UpdateSourceDto } from "./dto/update-source.dto";
import {
  SourceConflictError,
  SourceNotFoundError,
  SourceService,
  SourceValidationError,
} from "./source.service";
import { type Source } from "./source";

@Controller("sources")
export class SourceController {
  constructor(private readonly sources: SourceService) {}

  @Get()
  list(): Promise<Source[]> {
    return this.sources.list();
  }

  @Post()
  async create(@Body() dto: CreateSourceDto): Promise<Source> {
    return this.handle(() =>
      this.sources.create({
        name: dto.name,
        tier: dto.tier,
        weight: dto.weight,
        channelType: dto.channelType,
      }),
    );
  }

  @Put(":sourceId")
  async update(@Param("sourceId") sourceId: string, @Body() dto: UpdateSourceDto): Promise<Source> {
    return this.handle(() =>
      this.sources.update(sourceId, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.tier !== undefined ? { tier: dto.tier } : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        ...(dto.channelType !== undefined ? { channelType: dto.channelType } : {}),
      }),
    );
  }

  @Delete(":sourceId")
  async remove(@Param("sourceId") sourceId: string): Promise<{ deleted: true }> {
    await this.handle(() => this.sources.remove(sourceId));
    return { deleted: true };
  }

  private async handle<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof SourceNotFoundError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof SourceValidationError) {
        throw new BadRequestException(err.errors);
      }
      if (err instanceof SourceConflictError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
