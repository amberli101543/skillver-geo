export interface MatrixCell {
  id: string;
  brandId: string;
  intent: string;
  angle: string;
  stage: string;
  audience: string;
  title: string;
  priority: number;
}

export type MatrixCellInput = Omit<MatrixCell, "id">;

export type MatrixCellUpdate = Partial<Pick<MatrixCell, "intent" | "angle" | "stage" | "audience" | "title" | "priority">>;

export interface ValidationError {
  field: string;
  message: string;
}

const MAX_FIELD_LEN = 200;
const DIMENSION_FIELDS = ["intent", "angle", "stage", "audience", "title"] as const;

export const DEFAULT_MATRIX_STAGE = "全阶段";
export const DEFAULT_MATRIX_AUDIENCE = "通用受众";

export function validateMatrixCellInput(input: Partial<MatrixCellInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of DIMENSION_FIELDS) {
    const value = input[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push({ field, message: `${field} is required` });
    } else if (value.trim().length > MAX_FIELD_LEN) {
      errors.push({ field, message: `${field} must be at most ${MAX_FIELD_LEN} characters` });
    }
  }
  if (input.priority !== undefined) {
    if (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 100) {
      errors.push({ field: "priority", message: "priority must be an integer between 0 and 100" });
    }
  }
  return errors;
}

export function normalizeMatrixCellFields(input: {
  intent: string;
  angle: string;
  title: string;
  stage?: string;
  audience?: string;
  priority?: number;
}): Pick<MatrixCellInput, "intent" | "angle" | "stage" | "audience" | "title" | "priority"> {
  return {
    intent: input.intent.trim(),
    angle: input.angle.trim(),
    stage: (input.stage?.trim() || DEFAULT_MATRIX_STAGE),
    audience: (input.audience?.trim() || DEFAULT_MATRIX_AUDIENCE),
    title: input.title.trim(),
    priority: input.priority ?? 0,
  };
}

export function matrixCellKey(cell: Pick<MatrixCell, "intent" | "angle" | "stage" | "audience">): string {
  return `${cell.intent}\0${cell.angle}\0${cell.stage}\0${cell.audience}`;
}
