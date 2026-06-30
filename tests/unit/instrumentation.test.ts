const telemetryServiceMock = vi.hoisted(() => ({
  recordServerError: vi.fn(),
}));

const logServerEventMock = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
}));

vi.mock("@/lib/server/modules/telemetry/service", () => ({
  telemetryService: telemetryServiceMock,
}));

vi.mock("@/lib/server/observability/log", () => logServerEventMock);

import { onRequestError } from "@/instrumentation";

describe("onRequestError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records sanitized server request errors", async () => {
    await onRequestError(
      Object.assign(new Error("boom"), { digest: "digest-1" }),
      {
        path: "/articoli/test?token=secret",
        method: "GET",
        headers: {
          "user-agent": "Test browser",
          "x-request-id": "request-1",
          cookie: "secret=1",
        },
      },
      {
        routerKind: "App Router",
        routePath: "/app/(public)/articoli/[slug]/page",
        routeType: "render",
        renderSource: "server-rendering",
        revalidateReason: undefined,
      },
    );

    expect(telemetryServiceMock.recordServerError).toHaveBeenCalledWith({
      source: "server",
      name: "Error",
      message: "boom",
      digest: "digest-1",
      path: "/articoli/test?token=secret",
      method: "GET",
      routePath: "/app/(public)/articoli/[slug]/page",
      routeType: "render",
      requestId: "request-1",
      userAgent: "Test browser",
      metadata: {
        routerKind: "App Router",
        renderSource: "server-rendering",
        revalidateReason: null,
      },
    });
  });

  it("logs telemetry failures without throwing", async () => {
    telemetryServiceMock.recordServerError.mockRejectedValue(new Error("db down"));

    await expect(
      onRequestError(
        new Error("boom"),
        {
          path: "/api/test",
          method: "POST",
          headers: { "x-request-id": "request-1" },
        },
        {
          routerKind: "App Router",
          routePath: "/app/api/test/route",
          routeType: "route",
          renderSource: undefined,
          revalidateReason: undefined,
        },
      ),
    ).resolves.toBeUndefined();

    expect(logServerEventMock.logServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "REQUEST_ERROR_TELEMETRY_FAILED",
        level: "error",
        requestId: "request-1",
      }),
    );
  });
});
