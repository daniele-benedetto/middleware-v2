import { telemetryCollectorPayloadSchema } from "@/lib/server/modules/telemetry/schema";

describe("telemetry payload schema", () => {
  it("accepts analytics payloads with small metadata", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "analytics",
      event: "page_view",
      path: "/articoli/test",
      referrer: "https://example.com/source",
      metadata: { articleSlug: "test" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported analytics events", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "analytics",
      event: "click_everything",
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

  it("accepts web vital payloads", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "web-vital",
      metricId: "v3-123",
      name: "LCP",
      value: 1200,
      delta: 1200,
      rating: "good",
      navigationType: "navigate",
      path: "/",
    });

    expect(result.success).toBe(true);
  });
});
