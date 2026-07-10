import { describe, it, expect } from "vitest";
import { validateBrand, isValidBrandInput, type BrandInput } from "./brand";

const valid: BrandInput = { name: "Acme", definition: "A SaaS brand" };

describe("validateBrand", () => {
  it("passes for a complete brand", () => {
    expect(validateBrand(valid)).toEqual([]);
    expect(isValidBrandInput(valid)).toBe(true);
  });

  it("reports each missing required field", () => {
    const errors = validateBrand({});
    expect(errors.map((e) => e.field).sort()).toEqual(["definition", "name"]);
  });

  it("treats whitespace-only values as missing", () => {
    const errors = validateBrand({ name: "  ", definition: "x" });
    expect(errors).toContainEqual({ field: "name", message: "name is required" });
  });

  it("rejects an overly long name", () => {
    const errors = validateBrand({ ...valid, name: "a".repeat(121) });
    expect(errors).toContainEqual({ field: "name", message: "name must be <= 120 chars" });
  });
});
