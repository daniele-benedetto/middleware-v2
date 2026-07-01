const performanceRepositoryMock = vi.hoisted(() => ({
  countBlockingErrors: vi.fn(),
  findRelatedEngagement: vi.fn(),
  listDetailRecords: vi.fn(),
  listSummaryRecords: vi.fn(),
  listTrendRecords: vi.fn(),
  listWorstPageRecords: vi.fn(),
  upsertExperience: vi.fn(),
}));
const observabilityAggregatesServiceMock = vi.hoisted(() => ({
  getPerformanceSummary: vi.fn(),
  getPerformanceTrend: vi.fn(),
  listPerformanceWorstPages: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-performance/repository", () => ({
  observabilityPerformanceRepository: performanceRepositoryMock,
}));
vi.mock("@/lib/server/modules/observability-aggregates/service", () => ({
  observabilityAggregatesService: observabilityAggregatesServiceMock,
}));

import {
  derivePerceivedQuality,
  observabilityPerformanceService,
  ratePerformanceMetric,
} from "@/lib/server/modules/observability-performance/service";

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "perf-1",
    sessionId: "session-1",
    visitorHash: "visitor-1",
    observabilityEventId: "event-1",
    pageInstanceId: "page-1",
    path: "/articoli/test",
    routePath: null,
    pageType: "article",
    contentId: "article-1",
    deviceType: "mobile",
    browser: "Safari",
    os: "iOS",
    connectionType: null,
    effectiveConnectionType: "4g",
    saveData: false,
    viewportWidth: 390,
    viewportHeight: 844,
    lcp: 1200,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
    rating: "good",
    perceivedQuality: "smooth",
    causedEarlyExit: false,
    activeTimeMs: 30_000,
    exitType: "unknown",
    hasBlockingError: false,
    correlatedErrorCount: 0,
    qualityReasons: [],
    release: "release-1",
    thresholdVersion: "performance-v1",
    sampleRate: 1,
    occurredAt: new Date("2026-07-01T10:00:00.000Z"),
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
    updatedAt: new Date("2026-07-01T10:00:00.000Z"),
    ...overrides,
  };
}

describe("observability performance service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceRepositoryMock.findRelatedEngagement.mockResolvedValue(null);
    performanceRepositoryMock.countBlockingErrors.mockResolvedValue(0);
    performanceRepositoryMock.upsertExperience.mockResolvedValue({ id: "perf-1" });
    observabilityAggregatesServiceMock.getPerformanceSummary.mockResolvedValue(null);
    observabilityAggregatesServiceMock.getPerformanceTrend.mockResolvedValue(null);
    observabilityAggregatesServiceMock.listPerformanceWorstPages.mockResolvedValue(null);
  });

  it("rates LCP boundaries", () => {
    expect(ratePerformanceMetric("lcp", 2500)).toBe("good");
    expect(ratePerformanceMetric("lcp", 3000)).toBe("needs_improvement");
    expect(ratePerformanceMetric("lcp", 4100)).toBe("poor");
  });

  it("rates INP instead of FID", () => {
    expect(ratePerformanceMetric("inp", 200)).toBe("good");
    expect(ratePerformanceMetric("inp", 350)).toBe("needs_improvement");
    expect(ratePerformanceMetric("inp", 600)).toBe("poor");
  });

  it("keeps technical poor separate from broken experience", () => {
    expect(
      derivePerceivedQuality({
        rating: "poor",
        metric: "lcp",
        causedEarlyExit: false,
      }),
    ).toBe("frustrating");
  });

  it("marks poor performance with blocking error as broken", () => {
    expect(
      derivePerceivedQuality({
        rating: "poor",
        metric: "inp",
        causedEarlyExit: true,
        hasBlockingError: true,
      }),
    ).toBe("broken");
  });

  it("marks needs improvement without exit as acceptable", () => {
    expect(
      derivePerceivedQuality({
        rating: "needs_improvement",
        metric: "ttfb",
        causedEarlyExit: false,
      }),
    ).toBe("acceptable");
  });

  it("ignores impossible metric values", async () => {
    await observabilityPerformanceService.recordMetric({
      sessionId: "session-1",
      pageInstanceId: "page-1",
      path: "/articoli/test",
      pageType: "article",
      sampleRate: 1,
      occurredAt: new Date("2026-07-01T10:00:00.000Z"),
      metric: { metric: "lcp", value: 999_999 },
    });

    expect(performanceRepositoryMock.upsertExperience).not.toHaveBeenCalled();
  });

  it("upserts metrics into a page performance episode", async () => {
    await observabilityPerformanceService.recordMetric({
      sessionId: "session-1",
      pageInstanceId: "page-1",
      path: "/articoli/test",
      pageType: "article",
      contentId: "article-1",
      sampleRate: 1,
      occurredAt: new Date("2026-07-01T10:00:00.000Z"),
      metric: { metric: "lcp", value: 1200, viewportWidth: 1280, viewportHeight: 720 },
    });

    expect(performanceRepositoryMock.upsertExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        pageInstanceId: "page-1",
        path: "/articoli/test",
        metric: "lcp",
        rating: "good",
        perceivedQuality: "smooth",
      }),
    );
  });

  it("uses engagement bounce to derive early exit", async () => {
    performanceRepositoryMock.findRelatedEngagement.mockResolvedValue({
      activeTimeMs: 1000,
      completed: false,
      engagementLevel: "glance",
      exitType: "bounce",
    });

    await observabilityPerformanceService.recordMetric({
      sessionId: "session-1",
      pageInstanceId: "page-1",
      path: "/articoli/test",
      pageType: "article",
      sampleRate: 1,
      occurredAt: new Date("2026-07-01T10:00:00.000Z"),
      metric: { metric: "lcp", value: 4200 },
    });

    expect(performanceRepositoryMock.upsertExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        causedEarlyExit: true,
        perceivedQuality: "frustrating",
        qualityReasons: expect.arrayContaining(["early_exit_after_poor_performance"]),
      }),
    );
  });

  it("marks poor performance with correlated blocking error as broken", async () => {
    performanceRepositoryMock.countBlockingErrors.mockResolvedValue(1);

    await observabilityPerformanceService.recordMetric({
      sessionId: "session-1",
      pageInstanceId: "page-1",
      path: "/articoli/test",
      pageType: "article",
      sampleRate: 1,
      occurredAt: new Date("2026-07-01T10:00:00.000Z"),
      metric: { metric: "inp", value: 800 },
    });

    expect(performanceRepositoryMock.upsertExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        hasBlockingError: true,
        correlatedErrorCount: 1,
        perceivedQuality: "broken",
        qualityReasons: expect.arrayContaining(["blocking_error_correlated"]),
      }),
    );
  });

  it("calculates p75 and degrades confidence for sampled records", async () => {
    performanceRepositoryMock.listSummaryRecords.mockResolvedValue([
      createRecord({ lcp: 1000, sampleRate: 0.25 }),
      createRecord({ id: "perf-2", lcp: 3000, sampleRate: 0.25 }),
      createRecord({ id: "perf-3", lcp: 5000, sampleRate: 0.25, rating: "poor" }),
    ]);

    const summary = await observabilityPerformanceService.getSummary({ days: 30 });

    expect(summary.vitals.find((metric) => metric.metric === "lcp")?.p75).toBe(5000);
    expect(summary.sampleConfidence).toBe("low");
  });

  it("segments detail by device and connection", async () => {
    performanceRepositoryMock.listDetailRecords.mockResolvedValue([
      createRecord({ deviceType: "mobile", effectiveConnectionType: "4g" }),
      createRecord({
        id: "perf-2",
        sessionId: "session-2",
        deviceType: "desktop",
        effectiveConnectionType: "wifi",
        perceivedQuality: "frustrating",
        causedEarlyExit: true,
      }),
    ]);

    const detail = await observabilityPerformanceService.getDetail({
      days: 30,
      path: "/articoli/test",
    });

    expect(detail.deviceSegments.map((segment) => segment.value)).toEqual(["mobile", "desktop"]);
    expect(detail.connectionSegments.map((segment) => segment.value)).toEqual(["4g", "wifi"]);
    expect(detail.timeline[0]?.observabilityEventId).toBe("event-1");
  });

  it("orders worst pages by qualitative impact", async () => {
    performanceRepositoryMock.listWorstPageRecords.mockResolvedValue([
      createRecord({ path: "/a", perceivedQuality: "smooth" }),
      createRecord({
        id: "perf-2",
        path: "/b",
        perceivedQuality: "frustrating",
        causedEarlyExit: true,
      }),
    ]);

    const result = await observabilityPerformanceService.listWorstPages(
      { days: 30, sortBy: "impact", sortOrder: "desc" },
      { page: 1, pageSize: 10 },
    );

    expect(result.items[0]?.path).toBe("/b");
    expect(result.items[0]?.qualityBreakdown).toEqual(
      expect.arrayContaining([expect.objectContaining({ quality: "frustrating", count: 1 })]),
    );
  });
});
