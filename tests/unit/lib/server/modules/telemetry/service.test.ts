const telemetryRepositoryMock = vi.hoisted(() => ({
  createAnalyticsEvent: vi.fn(),
  createWebVital: vi.fn(),
  upsertErrorLog: vi.fn(),
}));

vi.mock("@/lib/server/modules/telemetry/repository", () => ({
  telemetryRepository: telemetryRepositoryMock,
}));

import { telemetryService } from "@/lib/server/modules/telemetry/service";

describe("telemetry service helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANALYTICS_SALT_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://middleware.media";
  });

  it("derives stable visitor hashes within the same UTC day", () => {
    const first = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-06-30T10:00:00.000Z"),
      saltSecret: "secret",
    });
    const second = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-06-30T23:00:00.000Z"),
      saltSecret: "secret",
    });

    expect(second).toBe(first);
  });

  it("rotates visitor hashes across UTC days", () => {
    const first = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-06-30T23:59:00.000Z"),
      saltSecret: "secret",
    });
    const second = telemetryService.deriveDailyVisitorHash({
      ipAddress: "203.0.113.10",
      userAgent: "Test browser",
      date: new Date("2026-07-01T00:01:00.000Z"),
      saltSecret: "secret",
    });

    expect(second).not.toBe(first);
  });

  it("normalizes paths without query strings", () => {
    expect(
      telemetryService.normalizeTelemetryPath(
        "https://middleware.media/articoli/test?token=secret",
      ),
    ).toBe("/articoli/test");
  });

  it("skips technical paths", () => {
    expect(telemetryService.shouldSkipTelemetryPath("/api/telemetry")).toBe(true);
    expect(telemetryService.shouldSkipTelemetryPath("/_next/static/app.js")).toBe(true);
    expect(telemetryService.shouldSkipTelemetryPath("/cms/articles")).toBe(true);
    expect(telemetryService.shouldSkipTelemetryPath("/articoli/test")).toBe(false);
  });

  it("normalizes internal referrers to paths and external referrers to hostnames", () => {
    expect(
      telemetryService.normalizeTelemetryReferrer(
        "https://middleware.media/articoli/test?token=secret",
        "https://middleware.media",
      ),
    ).toBe("/articoli/test");
    expect(
      telemetryService.normalizeTelemetryReferrer(
        "https://search.example.com/results?q=middleware",
        "https://middleware.media",
      ),
    ).toBe("search.example.com");
  });

  it("uses normalized error messages for fingerprints", () => {
    const first = telemetryService.createErrorFingerprint({
      source: "server",
      name: "Error",
      message: "Missing id 550e8400-e29b-41d4-a716-446655440000",
      path: "/api/test",
    });
    const second = telemetryService.createErrorFingerprint({
      source: "server",
      name: "Error",
      message: "Missing id 550e8400-e29b-41d4-a716-446655440111",
      path: "/api/test",
    });

    expect(second).toBe(first);
  });

  it("records analytics payloads with normalized fields", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        type: "analytics",
        event: "article_view",
        path: "https://middleware.media/articoli/test?token=secret",
        referrer: "https://middleware.media/?preview=1",
        metadata: { articleSlug: "test" },
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
        country: "it",
      },
    );

    expect(telemetryRepositoryMock.createAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "article_view",
        path: "/articoli/test",
        referrer: "/",
        country: "IT",
        metadata: { articleSlug: "test" },
      }),
    );
    expect(telemetryRepositoryMock.createAnalyticsEvent.mock.calls[0]?.[0].visitorHash).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("skips analytics payloads for technical paths", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        type: "analytics",
        event: "page_view",
        path: "/cms/articles",
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
      },
    );

    expect(telemetryRepositoryMock.createAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("records web vital payloads", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        type: "web-vital",
        metricId: "metric-1",
        name: "LCP",
        value: 1200,
        delta: 1200,
        rating: "good",
        navigationType: "navigate",
        path: "/articoli/test",
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
      },
    );

    expect(telemetryRepositoryMock.createWebVital).toHaveBeenCalledWith(
      expect.objectContaining({
        metricId: "metric-1",
        name: "LCP",
        path: "/articoli/test",
        value: 1200,
      }),
    );
  });

  it("records client errors with a fingerprint", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        type: "client-error",
        source: "boundary",
        name: "Error",
        message: "Render failed 550e8400-e29b-41d4-a716-446655440000",
        path: "/articoli/test?token=secret",
        metadata: { component: "ArticlePage" },
      },
      {
        method: "POST",
        requestId: "request-1",
        userAgent: "Test browser",
      },
    );

    expect(telemetryRepositoryMock.upsertErrorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
        source: "boundary",
        name: "Error",
        message: "Render failed 550e8400-e29b-41d4-a716-446655440000",
        path: "/articoli/test",
        method: "POST",
        requestId: "request-1",
        metadata: { component: "ArticlePage" },
      }),
    );
  });
});
