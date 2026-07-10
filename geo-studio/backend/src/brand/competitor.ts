export interface Competitor {
  id: string;
  brandId: string;
  name: string;
}

export type CompetitorInput = Omit<Competitor, "id">;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCompetitor(input: Partial<CompetitorInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.name !== "string" || input.name.trim() === "") {
    errors.push({ field: "name", message: "name is required" });
  }
  return errors;
}
