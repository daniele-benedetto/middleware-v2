import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMock = vi.hoisted(() => ({
  listAuditAggregates: vi.fn(),
  listAuditErrorCandidates: vi.fn(),
  listBlockingErrorExitCandidates: vi.fn(),
  listContentAggregates: vi.fn(),
  listCriticalErrorGroups: vi.fn(),
  listErrorAggregates: vi.fn(),
  listPerformanceAggregates: vi.fn(),
  listReferrerQualityCandidates: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-overview/repository", () => ({
  observabilityOverviewRepository: repositoryMock,
}));

let service: typeof import("@/lib/server/modules/observability-overview/service");

beforeAll(async () => {
  service = await import("@/lib/server/modules/observability-overview/service");
});

beforeEach(() => {
  vi.clearAllMocks();
  repositoryMock.listContentAggregates.mockResolvedValue([]);
  repositoryMock.listPerformanceAggregates.mockResolvedValue([]);
  repositoryMock.listErrorAggregates.mockResolvedValue([]);
  repositoryMock.listAuditAggregates.mockResolvedValue([]);
  repositoryMock.listCriticalErrorGroups.mockResolvedValue([]);
  repositoryMock.listBlockingErrorExitCandidates.mockResolvedValue([]);
  repositoryMock.listAuditErrorCandidates.mockResolvedValue([]);
  repositoryMock.listReferrerQualityCandidates.mockResolvedValue([]);
});

describe("observabilityOverviewService", () => {
  it("calculates deterministic insight scores with confidence penalty", () => {
    const highConfidence = service.calculateInsightScore({
      impact: 80,
      confidence: "high",
      recency: 80,
      severity: "high",
      actionability: 80,
    });
    const lowConfidence = service.calculateInsightScore({
      impact: 80,
      confidence: "low",
      recency: 80,
      severity: "high",
      actionability: 80,
    });

    expect(highConfidence).toBeGreaterThan(lowConfidence);
    expect(highConfidence).toBeLessThanOrEqual(100);
  });

  it("keeps critical operational risk dominant in health score", () => {
    const health = service.calculateHealthScore({
      criticalHighErrors: 4,
      regressions: 2,
      frustratingOrBrokenExperiences: 0,
      highCriticalAuditActivities: 0,
      sensitiveAuditFailures: 0,
      averageQualityScore: 95,
      confidence: "high",
    });

    expect(health.score).toBeLessThan(80);
    expect(health.reasons).toContain("critical_regression");
  });

  it("builds ranked insight overview from cross-domain aggregates", async () => {
    repositoryMock.listContentAggregates.mockResolvedValueOnce([
      {
        date: new Date(),
        pageType: "article",
        contentType: "article",
        contentId: "article-1",
        path: "/articoli/test",
        totalVisits: 40,
        qualifiedVisits: 30,
        completedReads: 20,
        qualityScore: 82,
        sampleConfidence: "high",
      },
    ]);
    repositoryMock.listPerformanceAggregates
      .mockResolvedValueOnce([
        {
          date: new Date(),
          pageType: "article",
          path: "/articoli/test",
          contentId: "article-1",
          deviceType: "mobile",
          release: "release-1",
          totalExperiences: 20,
          frustratingCount: 8,
          brokenCount: 1,
          earlyExitCount: 3,
          poorRate: 0.45,
          sampleConfidence: "high",
        },
      ])
      .mockResolvedValueOnce([]);
    repositoryMock.listErrorAggregates.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    repositoryMock.listAuditAggregates.mockResolvedValueOnce([]);

    const overview = await service.observabilityOverviewService.overview({
      days: 30,
      includeLowConfidence: false,
      limit: 12,
    });

    expect(overview.insights[0]?.type).toBe("high_interest_poor_performance");
    expect(overview.watchFirst[0]?.deepLinks.map((item) => item.href)).toContain(
      "/cms/performance?path=%2Farticoli%2Ftest",
    );
  });

  it("does not surface low-confidence referrer insight unless requested", async () => {
    repositoryMock.listReferrerQualityCandidates.mockResolvedValue([
      {
        path: "/articoli/test",
        pageType: "article",
        contentId: "article-1",
        engagementLevel: "completed",
        completed: true,
        activeTimeMs: 60_000,
        session: { referrerDomain: "newsletter.example" },
      },
      {
        path: "/articoli/test",
        pageType: "article",
        contentId: "article-1",
        engagementLevel: "completed",
        completed: true,
        activeTimeMs: 60_000,
        session: { referrerDomain: "newsletter.example" },
      },
      {
        path: "/articoli/test",
        pageType: "article",
        contentId: "article-1",
        engagementLevel: "completed",
        completed: true,
        activeTimeMs: 60_000,
        session: { referrerDomain: "newsletter.example" },
      },
    ]);

    const hidden = await service.observabilityOverviewService.overview({
      days: 30,
      includeLowConfidence: false,
      limit: 12,
    });
    const visible = await service.observabilityOverviewService.overview({
      days: 30,
      includeLowConfidence: true,
      limit: 12,
    });

    expect(hidden.insights.some((item) => item.type === "referrer_quality_opportunity")).toBe(
      false,
    );
    expect(visible.insights.some((item) => item.type === "referrer_quality_opportunity")).toBe(
      true,
    );
  });
});
