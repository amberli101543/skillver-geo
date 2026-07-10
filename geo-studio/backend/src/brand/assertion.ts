export interface Assertion {
  id: string;
  brandId: string;
  text: string;
  evidence?: string;
}

export type AssertionInput = Omit<Assertion, "id">;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateAssertion(input: Partial<AssertionInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof input.text !== "string" || input.text.trim() === "") {
    errors.push({ field: "text", message: "text is required" });
  }
  return errors;
}
