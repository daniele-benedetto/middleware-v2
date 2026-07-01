import { telemetryCollectorPayloadSchema } from "@/lib/server/modules/telemetry/schema";

describe("telemetry payload schema", () => {
  it("accepts phase 2 batch session events", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      sessionId: "obs_session_1_0000",
      pageInstanceId: "page_0000",
      collectionMode: "full",
      events: [
        {
          type: "session_start",
          path: "/articoli/test",
          pageType: "article",
          sampleRate: 1,
          clientSequence: 1,
          clientElapsedMs: 10,
          metadata: { component: "ArticlePage" },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts client errors only inside the batch", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      sessionId: "obs_session_1_0000",
      pageInstanceId: "page_0000",
      collectionMode: "full",
      events: [
        {
          type: "client_error",
          source: "boundary",
          message: "boom",
          path: "/articoli/test",
          sampleRate: 1,
          clientSequence: 1,
          clientElapsedMs: 10,
        },
      ],
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

  it("rejects standalone client error payloads", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      type: "client-error",
      source: "client",
      message: "boom",
      path: "/",
    });

    expect(result.success).toBe(false);
  });

  it("rejects sensitive metadata", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      sessionId: "obs_session_1_0000",
      pageInstanceId: "page_0000",
      collectionMode: "full",
      events: [
        {
          type: "session_start",
          path: "/",
          sampleRate: 1,
          clientSequence: 1,
          clientElapsedMs: 10,
          metadata: { payload: "secret" },
        },
      ],
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
