import { reportClientError } from "@/lib/telemetry/client";

describe("reportClientError", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends boundary errors with sendBeacon when available", () => {
    const sendBeacon = vi.fn();

    vi.stubGlobal("navigator", { sendBeacon });

    reportClientError({
      error: Object.assign(new Error("boom"), { digest: "digest-1" }),
      path: "/articoli/test",
      metadata: { boundary: "test" },
    });

    expect(sendBeacon).toHaveBeenCalledWith(
      "/api/telemetry",
      JSON.stringify({
        type: "client-error",
        source: "boundary",
        name: "Error",
        message: "boom",
        digest: "digest-1",
        path: "/articoli/test",
        metadata: { boundary: "test" },
      }),
    );
  });

  it("falls back to fetch keepalive", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", fetchMock);

    reportClientError({
      error: new Error("boom"),
      path: "/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: expect.stringContaining('"type":"client-error"'),
      }),
    );
  });
});
