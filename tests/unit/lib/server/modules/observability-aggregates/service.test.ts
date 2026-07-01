import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMock = vi.hoisted(() => ({
  acquireJobRun: vi.fn(),
  finishJobRun: vi.fn(),
  failJobRun: vi.fn(),
  listContentSource: vi.fn(),
  listAudioSource: vi.fn(),
  listPerformanceSource: vi.fn(),
  listErrorSource: vi.fn(),
  listAuditSource: vi.fn(),
  replaceContentAggregates: vi.fn(),
  replacePerformanceAggregates: vi.fn(),
  replaceErrorAggregates: vi.fn(),
  replaceAuditAggregates: vi.fn(),
  prune: vi.fn(),
  listContentAggregates: vi.fn(),
  listPerformanceAggregates: vi.fn(),
  listErrorAggregates: vi.fn(),
  listAuditAggregates: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-aggregates/repository", () => ({
  observabilityAggregatesRepository: repositoryMock,
}));

let service: typeof import("@/lib/server/modules/observability-aggregates/service");

beforeAll(async () => {
  service = await import("@/lib/server/modules/observability-aggregates/service");
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("observability aggregate model", () => {
  it("builds UTC day windows from explicit bounds", () => {
    const window = service.buildAggregationWindow({
      from: "2026-07-01T14:45:00.000Z",
      to: "2026-07-03T02:10:00.000Z",
      days: 7,
      domains: ["all"],
      force: false,
      dryRun: false,
    });

    expect(window.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-07-04T00:00:00.000Z");
  });

  it("calculates explainable content quality score components", () => {
    const result = service.calculateContentQualityScore({
      completedReads: 8,
      qualifiedVisits: 10,
      totalVisits: 20,
      significantReturns: 2,
      averageActiveTimeMs: 45_000,
      expectedActiveTimeMs: 60_000,
      poorPerformanceSessions: 1,
      errorImpactedSessions: 1,
      sessions: 10,
    });

    expect(result.score).toBe(51);
    expect(result.components.completionRate).toBe(0.8);
    expect(result.components.qualifiedRatio).toBe(0.5);
    expect(result.components.returnRate).toBe(0.2);
    expect(result.components.perfPenalty).toBe(0.1);
    expect(result.components.errorPenalty).toBe(0.1);
  });

  it("keeps zero denominator scores deterministic", () => {
    const result = service.calculateContentQualityScore({
      completedReads: 0,
      qualifiedVisits: 0,
      totalVisits: 0,
      significantReturns: 0,
      averageActiveTimeMs: 0,
      poorPerformanceSessions: 0,
      errorImpactedSessions: 0,
      sessions: 0,
    });

    expect(result.score).toBe(0);
    expect(result.components.completionRate).toBe(0);
    expect(result.components.qualifiedRatio).toBe(0);
  });

  it("marks small or heavily sampled data as low confidence", () => {
    expect(service.sampleConfidence(10, 1)).toBe("low");
    expect(service.sampleConfidence(80, 1)).toBe("medium");
    expect(service.sampleConfidence(150, 1)).toBe("high");
    expect(service.sampleConfidence(150, 0.25)).toBe("low");
  });

  it("calculates p75 from observed samples", () => {
    expect(service.percentile([100, 200, 300, 400], 75)).toBe(300);
    expect(service.percentile([], 75)).toBeNull();
  });

  it("runs aggregate jobs through lock and replace-window repositories", async () => {
    repositoryMock.acquireJobRun.mockResolvedValue({ id: "00000000-0000-0000-0000-000000000001" });
    repositoryMock.listContentSource.mockResolvedValue([]);
    repositoryMock.listAudioSource.mockResolvedValue([]);
    repositoryMock.listPerformanceSource.mockResolvedValue([]);
    repositoryMock.listErrorSource.mockResolvedValue([]);
    repositoryMock.replaceContentAggregates.mockResolvedValue(0);

    const result = await service.observabilityAggregatesService.aggregate({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-01T00:00:00.000Z",
      days: 7,
      domains: ["content"],
      force: false,
      dryRun: false,
    });

    expect(result.jobRunId).toBe("00000000-0000-0000-0000-000000000001");
    expect(repositoryMock.acquireJobRun).toHaveBeenCalledOnce();
    expect(repositoryMock.replaceContentAggregates).toHaveBeenCalledOnce();
    expect(repositoryMock.finishJobRun).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      expect.objectContaining({ processedRows: 0 }),
    );
  });

  it("skips aggregation when a live lock exists", async () => {
    repositoryMock.acquireJobRun.mockResolvedValue(null);

    const result = await service.observabilityAggregatesService.aggregate({
      days: 1,
      domains: ["content"],
      force: false,
      dryRun: false,
    });

    expect(result.processedRows).toBe(0);
    expect(repositoryMock.replaceContentAggregates).not.toHaveBeenCalled();
  });

  it("delegates pruning to repository with configured retention", async () => {
    vi.stubEnv("OBSERVABILITY_RAW_RETENTION_DAYS", "30");
    repositoryMock.prune.mockResolvedValue({ events: 2 });

    await expect(service.observabilityAggregatesService.prune()).resolves.toEqual({ events: 2 });

    expect(repositoryMock.prune).toHaveBeenCalledWith(
      expect.objectContaining({ raw: expect.any(Date) }),
    );
    vi.unstubAllEnvs();
  });

  it("builds telemetry summary DTOs from persisted content aggregates", async () => {
    repositoryMock.listContentAggregates.mockResolvedValue([
      {
        date: new Date("2026-07-01T00:00:00.000Z"),
        pageType: "article",
        contentType: "article",
        contentId: "article-1",
        path: "/articoli/test",
        totalVisits: 10,
        qualifiedVisits: 6,
        completedReads: 3,
        averageActiveTimeMs: 45_000,
        significantReturns: 2,
      },
    ]);

    const summary = await service.observabilityAggregatesService.getTelemetryEngagementSummary({
      days: 30,
    });

    expect(summary?.qualifiedVisits).toBe(6);
    expect(summary?.completedReads).toBe(3);
    expect(summary?.topContent[0]?.path).toBe("/articoli/test");
  });

  it("builds performance summary DTOs from persisted performance aggregates", async () => {
    repositoryMock.listPerformanceAggregates.mockResolvedValue([
      {
        date: new Date("2026-07-01T00:00:00.000Z"),
        totalExperiences: 10,
        smoothCount: 6,
        acceptableCount: 1,
        frustratingCount: 2,
        brokenCount: 1,
        earlyExitCount: 2,
        lcpP75: 3000,
        inpP75: 100,
        clsP75: 0.05,
        fcpP75: 1000,
        ttfbP75: 300,
      },
    ]);

    const summary = await service.observabilityAggregatesService.getPerformanceSummary({
      days: 30,
    });

    expect(summary?.totalExperiences).toBe(10);
    expect(summary?.frustratingRate).toBe(0.3);
    expect(summary?.vitals.find((item) => item.metric === "lcp")?.p75).toBe(3000);
  });

  it("builds audit summary DTOs from persisted audit aggregates", async () => {
    repositoryMock.listAuditAggregates.mockResolvedValue([
      {
        publicImpact: true,
        activityCount: 5,
        highCriticalCount: 2,
        failureCount: 1,
        sensitiveActionCount: 1,
        activeActorCount: 2,
      },
    ]);

    const summary = await service.observabilityAggregatesService.getAuditSummary();

    expect(summary).toEqual({
      highRiskCount: 2,
      publicImpactCount: 5,
      failureCount: 1,
      activeActorCount: 2,
      sensitiveActionCount: 1,
    });
  });
});
