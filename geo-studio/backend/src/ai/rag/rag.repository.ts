import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type RagChunkInput,
  type RagChunkRecord,
  type RagRetrieveOptions,
  type RagSimilarHit,
  type RagSourceType,
} from "./rag.types";
import { cosineSimilarity } from "./similarity";
import { toVectorLiteral } from "./vector";

export abstract class RagRepository {
  abstract replaceBySourceType(brandId: string, sourceType: RagSourceType, chunks: RagChunkInput[]): Promise<void>;
  abstract listByBrand(brandId: string, sourceTypes?: RagSourceType[]): Promise<RagChunkRecord[]>;
  abstract retrieveSimilar(
    brandId: string,
    queryEmbedding: number[],
    options?: Pick<RagRetrieveOptions, "topK" | "sourceTypes">,
  ): Promise<RagSimilarHit[]>;
}

@Injectable()
export class PrismaRagRepository extends RagRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async replaceBySourceType(brandId: string, sourceType: RagSourceType, chunks: RagChunkInput[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.brandKnowledgeChunk.deleteMany({ where: { brandId, sourceType } });
      for (const chunk of chunks) {
        const id = randomUUID();
        const embedding = chunk.embedding?.length ? chunk.embedding : null;
        if (embedding) {
          const vectorLiteral = toVectorLiteral(embedding);
          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO brand_knowledge_chunks (id, brand_id, source_type, text, embedding, created_at, updated_at)
              VALUES (
                ${id}::text,
                ${brandId},
                ${sourceType},
                ${chunk.text},
                ${vectorLiteral}::vector,
                NOW(),
                NOW()
              )
            `,
          );
        } else {
          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO brand_knowledge_chunks (id, brand_id, source_type, text, embedding, created_at, updated_at)
              VALUES (${id}::text, ${brandId}, ${sourceType}, ${chunk.text}, NULL, NOW(), NOW())
            `,
          );
        }
      }
    });
  }

  async listByBrand(brandId: string, sourceTypes?: RagSourceType[]): Promise<RagChunkRecord[]> {
    const rows = await this.prisma.brandKnowledgeChunk.findMany({
      where: {
        brandId,
        ...(sourceTypes?.length ? { sourceType: { in: sourceTypes } } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        brandId: true,
        sourceType: true,
        text: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      brandId: row.brandId,
      sourceType: row.sourceType as RagSourceType,
      text: row.text,
      embedding: null,
    }));
  }

  async retrieveSimilar(
    brandId: string,
    queryEmbedding: number[],
    options: Pick<RagRetrieveOptions, "topK" | "sourceTypes"> = {},
  ): Promise<RagSimilarHit[]> {
    const topK = options.topK ?? 3;
    const sourceTypes = options.sourceTypes ?? ["assertion", "brand"];
    const vectorLiteral = toVectorLiteral(queryEmbedding);

    const rows = await this.prisma.$queryRaw<Array<{ text: string; score: number }>>(
      Prisma.sql`
        SELECT text, (1 - (embedding <=> ${vectorLiteral}::vector)) AS score
        FROM brand_knowledge_chunks
        WHERE brand_id = ${brandId}
          AND source_type IN (${Prisma.join(sourceTypes)})
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${topK}
      `,
    );

    return rows
      .filter((row) => typeof row.score === "number" && row.score > 0)
      .map((row) => ({ text: row.text, score: row.score }));
  }
}

export class InMemoryRagRepository extends RagRepository {
  private readonly rows: RagChunkRecord[] = [];
  private seq = 0;

  async replaceBySourceType(brandId: string, sourceType: RagSourceType, chunks: RagChunkInput[]): Promise<void> {
    for (let i = this.rows.length - 1; i >= 0; i -= 1) {
      if (this.rows[i]!.brandId === brandId && this.rows[i]!.sourceType === sourceType) {
        this.rows.splice(i, 1);
      }
    }
    for (const chunk of chunks) {
      this.rows.push({
        id: `chunk_${++this.seq}`,
        brandId,
        sourceType,
        text: chunk.text,
        embedding: chunk.embedding ?? null,
      });
    }
  }

  async listByBrand(brandId: string, sourceTypes?: RagSourceType[]): Promise<RagChunkRecord[]> {
    return this.rows.filter(
      (row) => row.brandId === brandId && (!sourceTypes?.length || sourceTypes.includes(row.sourceType)),
    );
  }

  async retrieveSimilar(
    brandId: string,
    queryEmbedding: number[],
    options: Pick<RagRetrieveOptions, "topK" | "sourceTypes"> = {},
  ): Promise<RagSimilarHit[]> {
    const topK = options.topK ?? 3;
    const sourceTypes = options.sourceTypes ?? ["assertion", "brand"];
    return this.rows
      .filter(
        (row) =>
          row.brandId === brandId &&
          sourceTypes.includes(row.sourceType) &&
          row.embedding &&
          row.embedding.length > 0,
      )
      .map((row) => ({
        text: row.text,
        score: cosineSimilarity(queryEmbedding, row.embedding!),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
