import { afterEach, describe, expect, it, vi } from "vitest";
import { type Alert } from "./alert";
import { AlertDispatcherService } from "./alert-dispatcher.service";

const sampleAlert: Alert = {
  id: "alert_1",
  brandId: "brand_1",
  type: "threshold",
  severity: "warn",
  title: "提及率低于阈值",
  message: "当前 20%",
  status: "open",
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

describe("AlertDispatcherService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts webhook payload when enabled", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const dispatcher = new AlertDispatcherService();
    const result = await dispatcher.dispatch(
      "brand_1",
      [sampleAlert],
      {
        webhookEnabled: true,
        webhookUrl: "https://hooks.example.com/alerts",
        emailEnabled: false,
        emailTo: null,
      },
      "run_1",
    );

    expect(result.webhookSent).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(firstCall[0]).toBe("https://hooks.example.com/alerts");
    const body = JSON.parse(String(firstCall[1].body));
    expect(body.brandId).toBe("brand_1");
    expect(body.diagnosticRunId).toBe("run_1");
    expect(body.alerts[0].id).toBe("alert_1");
  });

  it("records webhook errors without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    const dispatcher = new AlertDispatcherService();
    const result = await dispatcher.dispatch("brand_1", [sampleAlert], {
      webhookEnabled: true,
      webhookUrl: "https://hooks.example.com/alerts",
      emailEnabled: false,
      emailTo: null,
    });

    expect(result.webhookSent).toBe(false);
    expect(result.errors[0]).toContain("webhook");
  });
});
