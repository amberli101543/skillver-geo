import { Injectable } from "@nestjs/common";
import type { Brand as PrismaBrandRow } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { type Brand, type BrandInput } from "./brand";

export abstract class BrandRepository {
  abstract create(input: BrandInput): Promise<Brand>;
  abstract findById(id: string): Promise<Brand | null>;
  abstract list(): Promise<Brand[]>;
  abstract update(id: string, input: BrandInput): Promise<Brand | null>;
  abstract delete(id: string): Promise<boolean>;
}

function toDomain(row: PrismaBrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    definition: row.definition,
    positioning: row.positioning ?? undefined,
  };
}

@Injectable()
export class PrismaBrandRepository extends BrandRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: BrandInput): Promise<Brand> {
    const row = await this.prisma.brand.create({
      data: {
        name: input.name,
        definition: input.definition,
        positioning: input.positioning ?? null,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Brand | null> {
    const row = await this.prisma.brand.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async list(): Promise<Brand[]> {
    const rows = await this.prisma.brand.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDomain);
  }

  async update(id: string, input: BrandInput): Promise<Brand | null> {
    try {
      const row = await this.prisma.brand.update({
        where: { id },
        data: {
          name: input.name,
          definition: input.definition,
          positioning: input.positioning ?? null,
        },
      });
      return toDomain(row);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.prisma.brand.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
