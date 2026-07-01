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

  it("accepts engagement audio and media events", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      sessionId: "obs_session_1_0000",
      pageInstanceId: "page_0000",
      collectionMode: "full",
      events: [
        {
          type: "audio_complete",
          path: "/articoli/test/ascolta",
          pageType: "listen",
          contentType: "article",
          contentId: "article-1",
          sampleRate: 1,
          clientSequence: 1,
          clientElapsedMs: 90_000,
          metadata: { listenedMs: 90_000, completionRate: 1 },
        },
        {
          type: "media_open",
          path: "/articoli/test",
          pageType: "article",
          contentType: "article",
          contentId: "article-1",
          sampleRate: 1,
          clientSequence: 2,
          clientElapsedMs: 91_000,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts performance metrics only inside the batch", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      sessionId: "obs_session_1_0000",
      pageInstanceId: "page_0000",
      collectionMode: "full",
      events: [
        {
          type: "performance_metric",
          path: "/articoli/test",
          pageType: "article",
          contentType: "article",
          contentId: "article-1",
          sampleRate: 1,
          clientSequence: 1,
          clientElapsedMs: 1200,
          metadata: {
            metric: "lcp",
            value: 1200,
            metricId: "lcp-1",
            viewportWidth: 1280,
            viewportHeight: 720,
            effectiveConnectionType: "4g",
          },
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

  it("rejects FID performance metrics", () => {
    const result = telemetryCollectorPayloadSchema.safeParse({
      sessionId: "obs_session_1_0000",
      pageInstanceId: "page_0000",
      collectionMode: "full",
      events: [
        {
          type: "performance_metric",
          path: "/",
          sampleRate: 1,
          clientSequence: 1,
          clientElapsedMs: 10,
          metadata: { metric: "fid", value: 12 },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
