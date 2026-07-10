export interface Brand {
  id: string;
  name: string;
  definition: string;
  positioning?: string;
}

export type BrandInput = Omit<Brand, "id">;

export interface ValidationError {
  field: string;
  message: string;
}

const REQUIRED_FIELDS: Array<keyof BrandInput> = ["name", "definition"];
const MAX_NAME_LENGTH = 120;

export function validateBrand(input: Partial<BrandInput>): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = input[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push({ field, message: `${field} is required` });
    }
  }
  if (typeof input.name === "string" && input.name.trim().length > MAX_NAME_LENGTH) {
    errors.push({ field: "name", message: `name must be <= ${MAX_NAME_LENGTH} chars` });
  }
  return errors;
}

export function isValidBrandInput(input: Partial<BrandInput>): input is BrandInput {
  return validateBrand(input).length === 0;
}
