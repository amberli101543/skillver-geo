import { describe, expect, it } from "vitest";
import {
  buildDistributionImpact,
  buildPublishImpactItem,
  groupSnapshotsToRunBaselines,
  pickRunsAroundPublish,
  resolveOverallDirection,
} from "./distribution-impact";
import { type MetricSnapshotRecord } from "../metrics/metric-types";
import { type PublishRecord } from "./publish-record";

function snap(
  runId: string,
  capturedAt: string,
  metric: string,
  value: number,
): MetricSnapshotRecord {
  return {
    id: `${runId}-${metric}`,
    brandId: "b1",
    diagnosticRunId: runId,
    metric: metric as MetricSnapshotRecord["metric"],
    value,
    capturedAt,
  };
}

const runs = groupSnapshotsToRunBaselines([
  snap("r1", "2026-06-01T00:00:00.000Z", "mention_rate", 0.3),
  snap("r1", "2026-06-01T00:00:00.000Z", "positive_rate", 0.4),
  snap("r1", "2026-06-01T00:00:00.000Z", "avg_accuracy", 0.5),
  snap("r2", "2026-06-10T00:00:00.000Z", "mention_rate", 0.5),
  snap("r2", "2026-06-10T00:00:00.000Z", "positive_rate", 0.5),
  snap("r2", "2026-06-10T00:00:00.000Z", "avg_accuracy", 0.6),
  snap("r3", "2026-06-20T00:00:00.000Z", "mention_rate", 0.7),
  snap("r3", "2026-06-20T00:00:00.000Z", "positive_rate", 0.6),
  snap("r3", "2026-06-20T00:00:00.000Z", "avg_accuracy", 0.75),
]);

describe("groupSnapshotsToRunBaselines", () => {
  it("groups three runs", () => {
    expect(runs).toHaveLength(3);
    expect(runs[0]?.values.mention_rate).toBe(0.3);
  });
});

describe("pickRunsAroundPublish", () => {
  it("finds before and after runs", () => {
    const picked = pickRunsAroundPublish(runs, "2026-06-05T00:00:00.000Z");
    expect(picked.before?.diagnosticRunId).toBe("r1");
    expect(picked.after?.diagnosticRunId).toBe("r2");
  });

  it("treats run at same timestamp as before baseline", () => {
    const picked = pickRunsAroundPublish(runs, "2026-06-10T00:00:00.000Z");
    expect(picked.before?.diagnosticRunId).toBe("r2");
    expect(picked.after?.diagnosticRunId).toBe("r3");
  });
});

describe("buildPublishImpactItem", () => {
  const record: PublishRecord = {
    id: "pub1",
    brandId: "b1",
    contentDraftId: "d1",
    channel: "manual",
    publishedAt: "2026-06-05T00:00:00.000Z",
    createdAt: "2026-06-05T00:00:00.000Z",
  };

  it("marks improved when metrics rise", () => {
    const item = buildPublishImpactItem(record, runs);
    expect(item.overallDirection).toBe("improved");
    expect(item.metrics.mention_rate.delta).toBeCloseTo(0.2);
    expect(item.summary).toContain("向好");
  });

  it("marks pending without after run", () => {
    const item = buildPublishImpactItem(
      { ...record, publishedAt: "2026-06-25T00:00:00.000Z" },
      runs,
    );
    expect(item.overallDirection).toBe("pending");
  });
});

describe("buildDistributionImpact", () => {
  it("returns items for all records", () => {
    const result = buildDistributionImpact(
      "b1",
      [
        {
          id: "pub1",
          brandId: "b1",
          contentDraftId: "d1",
          channel: "manual",
          publishedAt: "2026-06-12T00:00:00.000Z",
          createdAt: "2026-06-12T00:00:00.000Z",
        },
      ],
      [
        snap("r1", "2026-06-01T00:00:00.000Z", "mention_rate", 0.3),
        snap("r1", "2026-06-01T00:00:00.000Z", "positive_rate", 0.4),
        snap("r1", "2026-06-01T00:00:00.000Z", "avg_accuracy", 0.5),
        snap("r2", "2026-06-20T00:00:00.000Z", "mention_rate", 0.6),
        snap("r2", "2026-06-20T00:00:00.000Z", "positive_rate", 0.5),
        snap("r2", "2026-06-20T00:00:00.000Z", "avg_accuracy", 0.65),
      ],
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.overallDirection).toBe("improved");
  });
});

describe("resolveOverallDirection", () => {
  it("detects mixed", () => {
    const direction = resolveOverallDirection(
      {
        mention_rate: { before: 0.5, after: 0.7, delta: 0.2, direction: "up" },
        positive_rate: { before: 0.5, after: 0.4, delta: -0.1, direction: "down" },
        avg_accuracy: { before: 0.6, after: 0.4, delta: -0.2, direction: "down" },
      },
      true,
      true,
    );
    expect(direction).toBe("mixed");
  });
});
