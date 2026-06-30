import { telemetryCollectorPayloadSchema } from "@/lib/server/modules/telemetry/schema";

describe("telemetry payload schema", () => {
  it("accepts client error payloads with small metadata", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "client-error",
      source: "boundary",
      sessionId: "obs_session_1_0000",
      message: "boom",
      path: "/articoli/test",
      metadata: { component: "ArticlePage" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects legacy analytics payloads", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "analytics",
      event: "page_view",
      path: "/",
    });

    expect(result.success).toBe(false);
  });

  it("rejects verbose metadata", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "client-error",
      source: "client",
      message: "boom",
      path: "/",
      metadata: { payload: "x".repeat(3000) },
    });

    expect(result.success).toBe(false);
  });

  it("rejects legacy web vital payloads", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "web-vital",
      metricId: "v3-123",
      name: "LCP",
      value: 1200,
      delta: 1200,
      path: "/",
    });

    expect(result.success).toBe(false);
  });
});
