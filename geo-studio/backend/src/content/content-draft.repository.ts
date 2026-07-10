import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { type ContentDraft, type ContentDraftStatus, type ContentDraftUpdate, type ContentVerification } from "./content-draft";

export abstract class ContentDraftRepository {
  abstract listByCell(cellId: string): Promise<ContentDraft[]>;
  abstract listByBrand(brandId: string): Promise<ContentDraft[]>;
  abstract findById(brandId: string, draftId: string): Promise<ContentDraft | null>;
  abstract createNextVersion(
    cellId: string,
    body: string,
    ragSnippets?: string[],
  ): Promise<ContentDraft>;
  abstract update(brandId: string, draftId: string, input: ContentDraftUpdate): Promise<ContentDraft | null>;
  abstract saveVerification(
    brandId: string,
    draftId: string,
    verification: ContentVerification,
  ): Promise<ContentDraft | null>;
  abstract delete(brandId: string, draftId: string): Promise<boolean>;
}

function parseRagSnippets(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const snippets = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return snippets.length > 0 ? snippets : undefined;
}

function parseVerification(value: unknown): ContentVerification | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const v = value as Record<string, unknown>;
  if (
    typeof v.verifiedAt !== "string" ||
    typeof v.question !== "string" ||
    typeof v.engineId !== "string" ||
    typeof v.mentioned !== "boolean" ||
    typeof v.accuracy !== "number" ||
    typeof v.sentiment !== "string" ||
    typeof v.sourcesCount !== "number" ||
    typeof v.direction !== "string" ||
    typeof v.summary !== "string" ||
    !Array.isArray(v.hints)
  ) {
    return undefined;
  }
  const alignment = v.draftAlignment as Record<string, unknown> | undefined;
  if (
    !alignment ||
    typeof alignment.keyPhrasesInAnswer !== "number" ||
    typeof alignment.keyPhrasesChecked !== "number" ||
    typeof alignment.brandInAnswer !== "boolean"
  ) {
    return undefined;
  }
  return value as ContentVerification;
}

function toDraft(row: {
  id: string;
  cellId: string;
  body: string;
  status: string;
  version: number;
  ragSnippets?: unknown;
  verification?: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ContentDraft {
  const ragSnippets = parseRagSnippets(row.ragSnippets);
  const verification = parseVerification(row.verification);
  return {
    id: row.id,
    cellId: row.cellId,
    body: row.body,
    status: row.status as ContentDraftStatus,
    version: row.version,
    ...(ragSnippets ? { ragSnippets } : {}),
    ...(verification ? { verification } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PrismaContentDraftRepository extends ContentDraftRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByCell(cellId: string): Promise<ContentDraft[]> {
    const rows = await this.prisma.contentDraft.findMany({
      where: { cellId },
      orderBy: { version: "desc" },
    });
    return rows.map(toDraft);
  }

  async listByBrand(brandId: string): Promise<ContentDraft[]> {
    const rows = await this.prisma.contentDraft.findMany({
      where: { cell: { brandId } },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(toDraft);
  }

  async findById(brandId: string, draftId: string): Promise<ContentDraft | null> {
    const row = await this.prisma.contentDraft.findFirst({
      where: { id: draftId, cell: { brandId } },
    });
    return row ? toDraft(row) : null;
  }

  async createNextVersion(cellId: string, body: string, ragSnippets?: string[]): Promise<ContentDraft> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const latest = await tx.contentDraft.findFirst({
            where: { cellId },
            orderBy: { version: "desc" },
            select: { version: true },
          });
          const version = (latest?.version ?? 0) + 1;
          return tx.contentDraft.create({
            data: {
              cellId,
              body,
              version,
              status: "draft",
              ...(ragSnippets?.length ? { ragSnippets } : {}),
            },
          });
        });
        return toDraft(row);
      } catch (err) {
        if (isUniqueConstraintError(err) && attempt < 2) {
          continue;
        }
        throw err;
      }
    }
    throw new Error("failed to create content draft version");
  }

  async update(
    brandId: string,
    draftId: string,
    input: ContentDraftUpdate,
  ): Promise<ContentDraft | null> {
    const existing = await this.findById(brandId, draftId);
    if (!existing) return null;
    const row = await this.prisma.contentDraft.update({
      where: { id: draftId },
      data: {
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return toDraft(row);
  }

  async saveVerification(
    brandId: string,
    draftId: string,
    verification: ContentVerification,
  ): Promise<ContentDraft | null> {
    const existing = await this.findById(brandId, draftId);
    if (!existing) return null;
    const row = await this.prisma.contentDraft.update({
      where: { id: draftId },
      data: { verification: verification as object },
    });
    return toDraft(row);
  }

  async delete(brandId: string, draftId: string): Promise<boolean> {
    const existing = await this.findById(brandId, draftId);
    if (!existing) return false;
    await this.prisma.contentDraft.delete({ where: { id: draftId } });
    return true;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}
