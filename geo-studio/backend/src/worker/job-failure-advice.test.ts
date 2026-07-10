import { describe, expect, it } from "vitest";
import { buildJobFailureAdvice, enrichJobWithFailureAdvice } from "./job-failure-advice";
import { JOB_TYPES, type JobRecord, type JobType } from "./job.types";

function failedJob(type: JobType, error: string): Pick<JobRecord, "type" | "status" | "error"> {
  return { type, status: "failed", error };
}

describe("buildJobFailureAdvice", () => {
  it("returns undefined for non-failed jobs", () => {
    expect(buildJobFailureAdvice({ type: JOB_TYPES.ENGINE_TEST, status: "completed", error: null })).toBeUndefined();
  });

  it("suggests redis fix for dispatch errors", () => {
    const advice = buildJobFailureAdvice(
      failedJob(JOB_TYPES.DIAGNOSTIC_BATCH, "dispatch failed: ECONNREFUSED"),
    );
    expect(advice?.category).toBe("queue");
    expect(advice?.actions.some((a) => a.includes("Redis"))).toBe(true);
  });

  it("suggests API key fix for openai errors", () => {
    const advice = buildJobFailureAdvice(
      failedJob(JOB_TYPES.ENGINE_TEST, "OpenAI API key missing"),
    );
    expect(advice?.category).toBe("llm");
  });

  it("keeps perplexity api key errors in engine category", () => {
    const advice = buildJobFailureAdvice(
      failedJob(JOB_TYPES.ENGINE_TEST, "PERPLEXITY_API_KEY missing"),
    );
    expect(advice?.category).toBe("engine");
  });

  it("does not misclassify cancelled as matrix cell issue", () => {
    const advice = buildJobFailureAdvice(
      failedJob(JOB_TYPES.DIAGNOSTIC_BATCH, "job cancelled by operator"),
    );
    expect(advice?.category).toBe("diagnostic");
  });

  it("falls back to job type for generic errors", () => {
    const advice = buildJobFailureAdvice(failedJob(JOB_TYPES.CONTENT_GENERATE, "boom"));
    expect(advice?.category).toBe("content");
    expect(advice?.actions.length).toBeGreaterThan(0);
  });
});

describe("enrichJobWithFailureAdvice", () => {
  it("attaches advice to failed job record", () => {
    const job: JobRecord = {
      id: "j1",
      type: JOB_TYPES.DISTRIBUTION_EXECUTE,
      brandId: "b1",
      status: "failed",
      payload: {},
      result: null,
      error: "PublishConnectorError: CMS down",
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
      startedAt: null,
      completedAt: "2026-06-13T00:00:01.000Z",
    };
    const enriched = enrichJobWithFailureAdvice(job);
    expect(enriched.failureAdvice?.category).toBe("distribution");
  });
});
