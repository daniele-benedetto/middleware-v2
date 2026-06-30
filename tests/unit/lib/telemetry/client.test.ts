import { reportClientError, reportWebVital, track } from "@/lib/telemetry/client";

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

  it("tracks analytics events", () => {
    const sendBeacon = vi.fn();

    vi.stubGlobal("navigator", { sendBeacon });

    track({
      event: "page_view",
      path: "/articoli/test",
      referrer: "https://example.com",
      metadata: { articleSlug: "test" },
    });

    expect(sendBeacon).toHaveBeenCalledWith(
      "/api/telemetry",
      JSON.stringify({
        type: "analytics",
        event: "page_view",
        path: "/articoli/test",
        referrer: "https://example.com",
        metadata: { articleSlug: "test" },
      }),
    );
  });

  it("does not track technical paths", () => {
    const sendBeacon = vi.fn();

    vi.stubGlobal("navigator", { sendBeacon });

    track({ event: "page_view", path: "/cms/articles" });
    track({ event: "page_view", path: "/api/health" });
    track({ event: "page_view", path: "/_next/static/app.js" });

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("reports supported Web Vitals", () => {
    const sendBeacon = vi.fn();

    vi.stubGlobal("navigator", { sendBeacon });

    reportWebVital(
      {
        id: "metric-1",
        name: "LCP",
        value: 1200,
        delta: 1200,
        rating: "good",
        navigationType: "navigate",
      },
      "/articoli/test",
    );

    expect(sendBeacon).toHaveBeenCalledWith(
      "/api/telemetry",
      JSON.stringify({
        type: "web-vital",
        metricId: "metric-1",
        name: "LCP",
        value: 1200,
        delta: 1200,
        rating: "good",
        navigationType: "navigate",
        path: "/articoli/test",
      }),
    );
  });

  it("does not report unsupported Web Vitals", () => {
    const sendBeacon = vi.fn();

    vi.stubGlobal("navigator", { sendBeacon });

    reportWebVital(
      {
        id: "metric-1",
        name: "Next.js-render",
        value: 1200,
        delta: 1200,
      },
      "/articoli/test",
    );

    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
