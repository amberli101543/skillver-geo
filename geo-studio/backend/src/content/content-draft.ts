export type ContentDraftStatus = "draft" | "review" | "published";

export type ContentVerificationDirection = "favorable" | "neutral" | "needs_improvement";

export interface ContentVerification {
  verifiedAt: string;
  question: string;
  engineId: string;
  mentioned: boolean;
  accuracy: number;
  sentiment: "positive" | "neutral" | "negative";
  sourcesCount: number;
  direction: ContentVerificationDirection;
  summary: string;
  draftAlignment: {
    keyPhrasesInAnswer: number;
    keyPhrasesChecked: number;
    brandInAnswer: boolean;
  };
  hints: string[];
}

export interface ContentDraft {
  id: string;
  cellId: string;
  body: string;
  status: ContentDraftStatus;
  version: number;
  ragSnippets?: string[];
  verification?: ContentVerification;
  createdAt: string;
  updatedAt: string;
}

export interface ContentDraftUpdate {
  body?: string;
  status?: ContentDraftStatus;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const CONTENT_DRAFT_STATUSES: ContentDraftStatus[] = ["draft", "review", "published"];

export function validateContentDraftUpdate(input: ContentDraftUpdate): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.body !== undefined && input.body.trim() === "") {
    errors.push({ field: "body", message: "body cannot be empty" });
  }
  if (input.status !== undefined && !CONTENT_DRAFT_STATUSES.includes(input.status)) {
    errors.push({ field: "status", message: "invalid status" });
  }
  return errors;
}
