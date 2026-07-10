export interface PublishRecord {
  id: string;
  brandId: string;
  contentDraftId: string;
  sourceId?: string;
  distributionTaskId?: string;
  channel: string;
  externalUrl?: string;
  publishedAt: string;
  createdAt: string;
}

export interface PublishRecordInput {
  contentDraftId: string;
  sourceId?: string;
  distributionTaskId?: string;
  channel: string;
  externalUrl?: string;
  publishedAt?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validatePublishRecordInput(input: Partial<PublishRecordInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.contentDraftId !== "string" || input.contentDraftId.trim() === "") {
    errors.push({ field: "contentDraftId", message: "contentDraftId is required" });
  }
  if (typeof input.channel !== "string" || input.channel.trim() === "") {
    errors.push({ field: "channel", message: "channel is required" });
  }
  if (input.publishedAt !== undefined && Number.isNaN(Date.parse(input.publishedAt))) {
    errors.push({ field: "publishedAt", message: "publishedAt must be a valid ISO date" });
  }
  return errors;
}

export function normalizePublishRecordInput(
  input: PublishRecordInput,
): Omit<PublishRecordInput, "publishedAt"> & { publishedAt: Date } {
  return {
    contentDraftId: input.contentDraftId.trim(),
    channel: input.channel.trim(),
    ...(input.sourceId !== undefined ? { sourceId: input.sourceId } : {}),
    ...(input.distributionTaskId !== undefined ? { distributionTaskId: input.distributionTaskId } : {}),
    ...(input.externalUrl !== undefined ? { externalUrl: input.externalUrl.trim() } : {}),
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
  };
}
