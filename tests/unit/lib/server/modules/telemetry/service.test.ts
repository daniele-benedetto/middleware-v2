const telemetryRepositoryMock = vi.hoisted(() => ({
  countContentEngagementRecords: vi.fn(),
  getAudioEngagementForContent: vi.fn(),
  listContentEngagementDetailRecords: vi.fn(),
  listContentEngagementRecords: vi.fn(),
  listContentEngagementSummaryRecords: vi.fn(),
  recordSessionEvent: vi.fn(),
  upsertAudioEngagement: vi.fn(),
  upsertContentEngagement: vi.fn(),
}));
const observabilityErrorsServiceMock = vi.hoisted(() => ({
  recordOccurrence: vi.fn(),
}));
const observabilityPerformanceServiceMock = vi.hoisted(() => ({
  recordMetric: vi.fn(),
}));

vi.mock("@/lib/server/modules/telemetry/repository", () => ({
  telemetryRepository: telemetryRepositoryMock,
}));
vi.mock("@/lib/server/modules/observability-errors/service", () => ({
  observabilityErrorsService: observabilityErrorsServiceMock,
}));
vi.mock("@/lib/server/modules/observability-performance", async () => {
  const schema = await import("@/lib/server/modules/observability-performance/schema");
  return {
    performanceMetricPayloadSchema: schema.performanceMetricPayloadSchema,
    observabilityPerformanceService: observabilityPerformanceServiceMock,
  };
});

import { telemetryService } from "@/lib/server/modules/telemetry/service";

describe("telemetry service helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    telemetryRepositoryMock.recordSessionEvent.mockResolvedValue({ id: "event-1" });
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

  it("delegates client errors to the operational errors domain", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        sessionId: "obs_session_1_0000",
        pageInstanceId: "page_0000",
        collectionMode: "full",
        events: [
          {
            type: "client_error",
            source: "boundary",
            name: "Error",
            message: "Render failed 550e8400-e29b-41d4-a716-446655440000",
            stack: "at ArticlePage (/app/article.tsx:10:2)",
            path: "/articoli/test?token=secret",
            pageType: "article",
            contentId: "article-1",
            sampleRate: 1,
            clientSequence: 1,
            clientElapsedMs: 10,
            metadata: { component: "ArticlePage" },
          },
        ],
      },
      {
        ipAddress: "203.0.113.10",
        method: "POST",
        requestId: "request-1",
        userAgent: "Test browser",
        country: "it",
      },
    );

    expect(observabilityErrorsServiceMock.recordOccurrence).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "boundary",
        sessionId: "obs_session_1_0000",
        path: "/articoli/test",
        pageType: "article",
        contentId: "article-1",
        requestId: undefined,
        metadata: expect.objectContaining({
          component: "ArticlePage",
          pageInstanceId: "page_0000",
        }),
      }),
      expect.objectContaining({ requestId: "request-1" }),
    );
  });

  it("records session events with bot assessment", async () => {
    await telemetryService.recordTelemetryPayload(
      {
        sessionId: "obs_session_1_0000",
        pageInstanceId: "page_0000",
        collectionMode: "full",
        events: [
          {
            type: "session_heartbeat",
            path: "/articoli/test",
            pageType: "article",
            sampleRate: 0.5,
            clientSequence: 1,
            clientElapsedMs: 10,
          },
        ],
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Googlebot",
        country: "it",
      },
    );

    expect(telemetryRepositoryMock.recordSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          id: "obs_session_1_0000",
          isLikelyBot: true,
        }),
        event: expect.objectContaining({
          type: "session_heartbeat",
          category: "SESSION",
          sampleRate: 0.5,
          metadata: expect.objectContaining({
            botReasons: expect.stringContaining("bot_user_agent"),
          }),
        }),
      }),
    );
    expect(telemetryRepositoryMock.upsertContentEngagement).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "obs_session_1_0000",
        path: "/articoli/test",
        pageType: "article",
        sampleRate: 0.5,
      }),
    );
  });

  it("records audio engagement events", async () => {
    await telemetryService.recordTelemetryPayload(
      {
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
        ],
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
      },
    );

    expect(telemetryRepositoryMock.upsertContentEngagement).toHaveBeenCalledWith(
      expect.objectContaining({
        pageType: "listen",
        contentType: "article",
        contentId: "article-1",
        completed: true,
        engagementLevel: "completed",
      }),
    );
    expect(telemetryRepositoryMock.upsertAudioEngagement).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: "article-1",
        completed: true,
        listenedMs: 90_000,
        completionRate: 1,
      }),
    );
  });

  it("delegates performance metrics to the performance domain", async () => {
    await telemetryService.recordTelemetryPayload(
      {
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
            },
          },
        ],
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
      },
    );

    expect(telemetryRepositoryMock.recordSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          type: "performance_metric",
          category: "PERFORMANCE",
        }),
      }),
    );
    expect(observabilityPerformanceServiceMock.recordMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "obs_session_1_0000",
        observabilityEventId: "event-1",
        path: "/articoli/test",
        pageType: "article",
        contentId: "article-1",
        metric: expect.objectContaining({ metric: "lcp", value: 1200 }),
      }),
    );
  });

  it("builds engagement summary without views", async () => {
    telemetryRepositoryMock.listContentEngagementSummaryRecords.mockResolvedValue([
      {
        id: "eng-1",
        contentId: "article-1",
        slug: "test",
        path: "/articoli/test",
        pageType: "article",
        contentType: "article",
        firstSeenAt: new Date("2026-07-01T10:00:00.000Z"),
        lastSeenAt: new Date("2026-07-01T10:01:00.000Z"),
        activeTimeMs: 60_000,
        maxScrollDepth: 90,
        scrollMilestones: [25, 50, 75, 90],
        interactionCount: 2,
        completed: true,
        engagementLevel: "completed",
        exitType: "unknown",
        returnCountInSession: 1,
        refreshCount: 0,
      },
      {
        id: "eng-2",
        contentId: "article-2",
        slug: "bad",
        path: "/articoli/bad",
        pageType: "article",
        contentType: "article",
        firstSeenAt: new Date("2026-07-01T10:00:00.000Z"),
        lastSeenAt: new Date("2026-07-01T10:00:02.000Z"),
        activeTimeMs: 0,
        maxScrollDepth: 0,
        scrollMilestones: [],
        interactionCount: 0,
        completed: false,
        engagementLevel: "glance",
        exitType: "bounce",
        returnCountInSession: 0,
        refreshCount: 0,
      },
    ]);

    const summary = await telemetryService.getEngagementSummary({ days: 30 });

    expect(summary.qualifiedVisits).toBe(1);
    expect(summary.completedReads).toBe(1);
    expect(summary.lowQualityContent[0]?.slug).toBe("bad");
  });

  it("builds content engagement detail with audio breakdown", async () => {
    telemetryRepositoryMock.listContentEngagementDetailRecords.mockResolvedValue([
      {
        id: "eng-1",
        contentId: "article-1",
        slug: "test",
        path: "/articoli/test",
        pageType: "article",
        contentType: "article",
        firstSeenAt: new Date("2026-07-01T10:00:00.000Z"),
        lastSeenAt: new Date("2026-07-01T10:01:00.000Z"),
        activeTimeMs: 60_000,
        maxScrollDepth: 90,
        scrollMilestones: [25, 50, 75, 90],
        interactionCount: 2,
        completed: true,
        engagementLevel: "completed",
        exitType: "internal_navigation",
        returnCountInSession: 1,
        refreshCount: 1,
      },
    ]);
    telemetryRepositoryMock.getAudioEngagementForContent.mockResolvedValue({
      _count: { _all: 1 },
      _avg: { listenedMs: 90_000, completionRate: 1 },
      _sum: { seekCount: 2, replayCount: 1 },
    });

    const detail = await telemetryService.getContentEngagementDetail({
      days: 30,
      contentId: "article-1",
    });

    expect(detail.maxScrollDepth).toBe(90);
    expect(detail.audio?.seekCount).toBe(2);
    expect(detail.exitBreakdown[0]).toEqual({ exitType: "internal_navigation", count: 1 });
  });
});
