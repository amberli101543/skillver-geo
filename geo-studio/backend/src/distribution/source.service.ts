import { Injectable } from "@nestjs/common";
import {
  normalizeSourceInput,
  validateSourceInput,
  type Source,
  type SourceInput,
  type SourceUpdate,
  type ValidationError,
} from "./source";
import { SourceRepository } from "./source.repository";

export class SourceValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super("source validation failed");
    this.name = "SourceValidationError";
  }
}

export class SourceNotFoundError extends Error {
  constructor(public readonly sourceId: string) {
    super(`source ${sourceId} not found`);
    this.name = "SourceNotFoundError";
  }
}

export class SourceConflictError extends Error {
  constructor(public readonly name: string) {
    super(`source name ${name} already exists`);
    this.name = "SourceConflictError";
  }
}

@Injectable()
export class SourceService {
  constructor(private readonly repo: SourceRepository) {}

  list(): Promise<Source[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Source> {
    const source = await this.repo.findById(id);
    if (!source) {
      throw new SourceNotFoundError(id);
    }
    return source;
  }

  async create(input: SourceInput): Promise<Source> {
    const normalized = normalizeSourceInput(input);
    const errors = validateSourceInput(normalized);
    if (errors.length > 0) {
      throw new SourceValidationError(errors);
    }
    if (await this.repo.findByName(normalized.name)) {
      throw new SourceConflictError(normalized.name);
    }
    return this.repo.create(normalized);
  }

  async update(id: string, input: SourceUpdate): Promise<Source> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new SourceNotFoundError(id);
    }
    const merged: SourceInput = {
      name: input.name ?? existing.name,
      tier: input.tier ?? existing.tier,
      weight: input.weight ?? existing.weight,
      channelType: input.channelType ?? existing.channelType,
    };
    const normalized = normalizeSourceInput(merged);
    const errors = validateSourceInput(normalized);
    if (errors.length > 0) {
      throw new SourceValidationError(errors);
    }
    if (normalized.name !== existing.name && (await this.repo.findByName(normalized.name))) {
      throw new SourceConflictError(normalized.name);
    }
    const updated = await this.repo.update(id, normalized);
    if (!updated) {
      throw new SourceNotFoundError(id);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new SourceNotFoundError(id);
    }
  }
}
