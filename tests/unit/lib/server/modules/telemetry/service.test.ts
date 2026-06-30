const telemetryRepositoryMock = vi.hoisted(() => ({
  countErrorGroups: vi.fn(),
  getErrorGroupById: vi.fn(),
  listErrorGroups: vi.fn(),
  recordError: vi.fn(),
  updateErrorGroupStatus: vi.fn(),
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

  it("creates a coarser error signature", () => {
    const first = telemetryService.createErrorSignature({
      source: "server",
      name: "Error",
      message: "Missing id 550e8400-e29b-41d4-a716-446655440000",
      impactArea: "EDITORIAL",
    });
    const second = telemetryService.createErrorSignature({
      source: "server",
      name: "Error",
      message: "Missing id 550e8400-e29b-41d4-a716-446655440111",
      impactArea: "EDITORIAL",
    });

    expect(second).toBe(first);
  });

  it("records client errors through the phase 1 vertical slice", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        type: "client-error",
        source: "boundary",
        sessionId: "obs_session_1_0000",
        name: "Error",
        message: "Render failed 550e8400-e29b-41d4-a716-446655440000",
        stack: "at ArticlePage (/app/article.tsx:10:2)",
        path: "/articoli/test?token=secret",
        pageType: "article",
        contentId: "article-1",
        sampleRate: 1,
        metadata: { component: "ArticlePage" },
      },
      {
        ipAddress: "203.0.113.10",
        method: "POST",
        requestId: "request-1",
        userAgent: "Test browser",
        country: "it",
      },
    );

    expect(telemetryRepositoryMock.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          id: "obs_session_1_0000",
          country: "IT",
          landingPath: "/articoli/test",
        }),
        event: expect.objectContaining({
          sessionId: "obs_session_1_0000",
          type: "boundary_error",
          path: "/articoli/test",
          pageType: "article",
          contentId: "article-1",
          requestId: "request-1",
        }),
        group: expect.objectContaining({
          fingerprintVersion: 1,
          source: "BOUNDARY",
          impactArea: "PUBLIC_SITE",
        }),
        occurrence: expect.objectContaining({
          sessionId: "obs_session_1_0000",
          path: "/articoli/test",
          requestId: "request-1",
          metadata: { component: "ArticlePage" },
        }),
      }),
    );
  });

  it("records server errors without inventing a session", async () => {
    await telemetryService.recordServerError({
      source: "server",
      name: "Error",
      message: "Publish failed",
      path: "/cms/articles/1/edit",
      routePath: "/cms/articles/[id]/edit",
      method: "POST",
      statusCode: 500,
      actionContext: "publish",
      requestId: "request-1",
      userAgent: "Test browser",
    });

    expect(telemetryRepositoryMock.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        session: null,
        group: expect.objectContaining({
          source: "SERVER",
          severity: "HIGH",
          impactArea: "EDITORIAL",
          userImpact: "BLOCKED_ACTION",
        }),
        occurrence: expect.objectContaining({
          sessionId: null,
          routePath: "/cms/articles/[id]/edit",
          actionContext: "publish",
        }),
      }),
    );
  });
});
