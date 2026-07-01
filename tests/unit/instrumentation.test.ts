const observabilityErrorsServiceMock = vi.hoisted(() => ({
  recordServerError: vi.fn(),
}));

const logServerEventMock = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-errors/service", () => ({
  observabilityErrorsService: observabilityErrorsServiceMock,
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

    expect(observabilityErrorsServiceMock.recordServerError).toHaveBeenCalledWith(
      {
        name: "Error",
        message: "boom",
        digest: "digest-1",
        stack: expect.any(String),
        path: "/articoli/test?token=secret",
        method: "GET",
        routePath: "/app/(public)/articoli/[slug]/page",
        routeType: "render",
        requestId: "request-1",
        metadata: {
          routerKind: "App Router",
          renderSource: "server-rendering",
          revalidateReason: null,
        },
      },
      {
        userAgent: "Test browser",
        method: "GET",
        requestId: "request-1",
      },
    );
  });

  it("logs telemetry failures without throwing", async () => {
    observabilityErrorsServiceMock.recordServerError.mockRejectedValue(new Error("db down"));

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
