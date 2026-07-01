const telemetryServiceMock = vi.hoisted(() => ({
  recordTelemetryPayload: vi.fn(),
}));

const logServerEventMock = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
}));

const rateLimitMock = vi.hoisted(() => ({
  enforceRateLimitKey: vi.fn(),
  rateLimitPolicies: {
    telemetryIp: { name: "telemetry-ip", limit: 120, windowMs: 60_000 },
    telemetrySession: { name: "telemetry-session", limit: 60, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/server/modules/telemetry/service", () => ({
  telemetryService: telemetryServiceMock,
}));

vi.mock("@/lib/server/http/rate-limit", () => rateLimitMock);
vi.mock("@/lib/server/observability/log", () => logServerEventMock);

import { POST } from "@/app/api/telemetry/route";

function createTelemetryRequest(body: unknown, headers?: HeadersInit) {
  return new Request("https://middleware.media/api/telemetry", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Test browser",
      "x-forwarded-for": "203.0.113.10",
      "x-request-id": "request-1",
      "cf-ipcountry": "IT",
      dnt: "1",
      "sec-gpc": "1",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createValidBatch() {
  return {
    sessionId: "obs_session_1_0000",
    pageInstanceId: "page_0000",
    collectionMode: "minimal",
    events: [
      {
        type: "session_start",
        path: "/articoli/test",
        pageType: "article",
        sampleRate: 1,
        clientSequence: 1,
        clientElapsedMs: 10,
      },
    ],
  };
}

describe("POST /api/telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMock.enforceRateLimitKey.mockResolvedValue(undefined);
  });

  it("records valid batch telemetry payloads and returns 204", async () => {
    const payload = createValidBatch();
    const response = await POST(createTelemetryRequest(payload));

    expect(response.status).toBe(204);
    expect(rateLimitMock.enforceRateLimitKey).toHaveBeenCalledWith(
      "ip:203.0.113.10",
      rateLimitMock.rateLimitPolicies.telemetryIp,
    );
    expect(rateLimitMock.enforceRateLimitKey).toHaveBeenCalledWith(
      "session:obs_session_1_0000",
      rateLimitMock.rateLimitPolicies.telemetrySession,
    );
    expect(telemetryServiceMock.recordTelemetryPayload).toHaveBeenCalledWith(payload, {
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      country: "IT",
      method: "POST",
      requestId: "request-1",
      doNotTrack: "1",
      globalPrivacyControl: "1",
    });
  });

  it("records valid performance metric batches", async () => {
    const payload = {
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
          metadata: { metric: "lcp", value: 1200, viewportWidth: 1280, viewportHeight: 720 },
        },
      ],
    };

    const response = await POST(createTelemetryRequest(payload));

    expect(response.status).toBe(204);
    expect(telemetryServiceMock.recordTelemetryPayload).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ requestId: "request-1" }),
    );
  });

  it("ignores invalid and legacy payloads", async () => {
    const response = await POST(createTelemetryRequest({ type: "analytics", event: "page_view" }));

    expect(response.status).toBe(204);
    expect(telemetryServiceMock.recordTelemetryPayload).not.toHaveBeenCalled();
  });

  it("ignores legacy standalone web vital payloads", async () => {
    const response = await POST(
      createTelemetryRequest({ type: "web-vital", name: "LCP", value: 1200, path: "/" }),
    );

    expect(response.status).toBe(204);
    expect(telemetryServiceMock.recordTelemetryPayload).not.toHaveBeenCalled();
  });

  it("ignores rate limited payloads", async () => {
    rateLimitMock.enforceRateLimitKey.mockRejectedValue(new Error("limited"));

    const response = await POST(createTelemetryRequest(createValidBatch()));

    expect(response.status).toBe(204);
    expect(telemetryServiceMock.recordTelemetryPayload).not.toHaveBeenCalled();
  });

  it("ignores oversized payloads", async () => {
    const response = await POST(
      createTelemetryRequest("x".repeat(20 * 1024), { "content-length": String(20 * 1024) }),
    );

    expect(response.status).toBe(204);
    expect(telemetryServiceMock.recordTelemetryPayload).not.toHaveBeenCalled();
  });

  it("logs internal collector errors without failing the response", async () => {
    telemetryServiceMock.recordTelemetryPayload.mockRejectedValue(new Error("db down"));

    const response = await POST(createTelemetryRequest(createValidBatch()));

    expect(response.status).toBe(204);
    expect(logServerEventMock.logServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "TELEMETRY_COLLECTOR_ERROR",
        level: "error",
        requestId: "request-1",
      }),
    );
  });
});
