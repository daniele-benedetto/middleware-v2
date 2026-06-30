const telemetryServiceMock = vi.hoisted(() => ({
  recordTelemetryPayload: vi.fn(),
}));

const logServerEventMock = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
}));

vi.mock("@/lib/server/modules/telemetry/service", () => ({
  telemetryService: telemetryServiceMock,
}));

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
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records valid telemetry payloads and returns 204", async () => {
    const response = await POST(
      createTelemetryRequest({
        type: "client-error",
        source: "boundary",
        message: "boom",
        sessionId: "obs_session_1_0000",
        path: "/articoli/test",
      }),
    );

    expect(response.status).toBe(204);
    expect(telemetryServiceMock.recordTelemetryPayload).toHaveBeenCalledWith(
      {
        type: "client-error",
        source: "boundary",
        message: "boom",
        sampleRate: 1,
        sessionId: "obs_session_1_0000",
        path: "/articoli/test",
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
        country: "IT",
        method: "POST",
        requestId: "request-1",
      },
    );
  });

  it("ignores invalid payloads", async () => {
    const response = await POST(createTelemetryRequest({ type: "analytics", event: "page_view" }));

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

    const response = await POST(
      createTelemetryRequest({
        type: "client-error",
        source: "boundary",
        message: "boom",
        path: "/articoli/test",
      }),
    );

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
