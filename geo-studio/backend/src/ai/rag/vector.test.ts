import { describe, expect, it } from "vitest";
import { toVectorLiteral } from "./vector";

describe("vector helpers", () => {
  it("toVectorLiteral formats pgvector input", () => {
    expect(toVectorLiteral([1, 0.5, -1])).toBe("[1,0.5,-1]");
  });
});
