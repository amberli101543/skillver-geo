import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { type Source, type SourceInput, type SourceUpdate } from "./source";

export abstract class SourceRepository {
  abstract list(): Promise<Source[]>;
  abstract findById(id: string): Promise<Source | null>;
  abstract findByName(name: string): Promise<Source | null>;
  abstract create(input: SourceInput): Promise<Source>;
  abstract update(id: string, input: SourceUpdate): Promise<Source | null>;
  abstract delete(id: string): Promise<boolean>;
}

function toSource(row: {
  id: string;
  name: string;
  tier: string;
  weight: number;
  channelType: string;
}): Source {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier as Source["tier"],
    weight: row.weight,
    channelType: row.channelType as Source["channelType"],
  };
}

@Injectable()
export class PrismaSourceRepository extends SourceRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async list(): Promise<Source[]> {
    const rows = await this.prisma.source.findMany({ orderBy: [{ weight: "desc" }, { name: "asc" }] });
    return rows.map(toSource);
  }

  async findById(id: string): Promise<Source | null> {
    const row = await this.prisma.source.findUnique({ where: { id } });
    return row ? toSource(row) : null;
  }

  async findByName(name: string): Promise<Source | null> {
    const row = await this.prisma.source.findUnique({ where: { name } });
    return row ? toSource(row) : null;
  }

  async create(input: SourceInput): Promise<Source> {
    const row = await this.prisma.source.create({
      data: {
        name: input.name,
        tier: input.tier,
        weight: input.weight,
        channelType: input.channelType,
      },
    });
    return toSource(row);
  }

  async update(id: string, input: SourceUpdate): Promise<Source | null> {
    try {
      const row = await this.prisma.source.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.tier !== undefined ? { tier: input.tier } : {}),
          ...(input.weight !== undefined ? { weight: input.weight } : {}),
          ...(input.channelType !== undefined ? { channelType: input.channelType } : {}),
        },
      });
      return toSource(row);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.source.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
