import { afterEach, describe, expect, it } from "vitest";
import { isApiProcess, isWorkerProcess, processRole } from "./process-role";

describe("process-role", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("defaults to all", () => {
    delete process.env.PROCESS_ROLE;
    expect(processRole()).toBe("all");
    expect(isApiProcess()).toBe(true);
    expect(isWorkerProcess()).toBe(true);
  });

  it("supports api-only process", () => {
    process.env.PROCESS_ROLE = "api";
    expect(isApiProcess()).toBe(true);
    expect(isWorkerProcess()).toBe(false);
  });

  it("supports worker-only process", () => {
    process.env.PROCESS_ROLE = "worker";
    expect(isApiProcess()).toBe(false);
    expect(isWorkerProcess()).toBe(true);
  });
});
