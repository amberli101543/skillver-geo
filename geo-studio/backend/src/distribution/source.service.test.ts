import { beforeEach, describe, expect, it } from "vitest";
import { SourceService, SourceConflictError } from "./source.service";
import { SourceRepository } from "./source.repository";
import { type Source, type SourceInput, type SourceUpdate } from "./source";

class InMemorySourceRepository extends SourceRepository {
  private readonly rows: Source[] = [];
  private seq = 0;

  async list(): Promise<Source[]> {
    return [...this.rows];
  }

  async findById(id: string): Promise<Source | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async findByName(name: string): Promise<Source | null> {
    return this.rows.find((r) => r.name === name) ?? null;
  }

  async create(input: SourceInput): Promise<Source> {
    const row: Source = { id: `src_${++this.seq}`, ...input };
    this.rows.push(row);
    return row;
  }

  async update(id: string, input: SourceUpdate): Promise<Source | null> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    this.rows[idx] = { ...this.rows[idx]!, ...input };
    return this.rows[idx]!;
  }

  async delete(id: string): Promise<boolean> {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    this.rows.splice(idx, 1);
    return true;
  }
}

describe("SourceService", () => {
  let service: SourceService;

  beforeEach(() => {
    service = new SourceService(new InMemorySourceRepository());
  });

  it("creates and lists sources", async () => {
    const source = await service.create({
      name: "官网博客",
      tier: "owned",
      weight: 80,
      channelType: "api",
    });
    expect((await service.list()).length).toBe(1);
    expect(source.tier).toBe("owned");
  });

  it("rejects duplicate names", async () => {
    await service.create({
      name: "知乎",
      tier: "community",
      weight: 50,
      channelType: "manual",
    });
    await expect(
      service.create({
        name: "知乎",
        tier: "community",
        weight: 60,
        channelType: "export",
      }),
    ).rejects.toBeInstanceOf(SourceConflictError);
  });
});
