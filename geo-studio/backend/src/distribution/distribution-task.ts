export type DistributionTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export interface DistributionTask {
  id: string;
  brandId: string;
  contentDraftId: string;
  sourceId: string;
  priority: number;
  status: DistributionTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export type DistributionTaskInput = Pick<
  DistributionTask,
  "contentDraftId" | "sourceId" | "priority"
>;

export type DistributionTaskUpdate = Partial<Pick<DistributionTask, "priority" | "status">>;

export interface ValidationError {
  field: string;
  message: string;
}

export const DISTRIBUTION_TASK_STATUSES: DistributionTaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
];

export function validateDistributionTaskInput(input: Partial<DistributionTaskInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.contentDraftId !== "string" || input.contentDraftId.trim() === "") {
    errors.push({ field: "contentDraftId", message: "contentDraftId is required" });
  }
  if (typeof input.sourceId !== "string" || input.sourceId.trim() === "") {
    errors.push({ field: "sourceId", message: "sourceId is required" });
  }
  if (
    input.priority !== undefined &&
    (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 100)
  ) {
    errors.push({ field: "priority", message: "priority must be an integer between 0 and 100" });
  }
  return errors;
}

export function validateDistributionTaskUpdate(input: DistributionTaskUpdate): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.status !== undefined && !DISTRIBUTION_TASK_STATUSES.includes(input.status)) {
    errors.push({ field: "status", message: "invalid status" });
  }
  if (
    input.priority !== undefined &&
    (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 100)
  ) {
    errors.push({ field: "priority", message: "priority must be an integer between 0 and 100" });
  }
  return errors;
}
