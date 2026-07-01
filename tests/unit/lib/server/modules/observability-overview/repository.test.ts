const prismaMock = vi.hoisted(() => ({
  auditActivity: { findMany: vi.fn() },
  contentEngagement: { findMany: vi.fn() },
  dailyAuditAggregate: { findMany: vi.fn() },
  dailyContentQualityAggregate: { findMany: vi.fn() },
  dailyErrorAggregate: { findMany: vi.fn() },
  dailyPerformanceAggregate: { findMany: vi.fn() },
  errorGroup: { findMany: vi.fn() },
  errorOccurrence: { count: vi.fn(), findMany: vi.fn() },
  observabilityEvent: { findMany: vi.fn() },
  performanceExperience: { count: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { observabilityOverviewRepository } from "@/lib/server/modules/observability-overview/repository";

const window = {
  from: new Date("2026-07-01T00:00:00.000Z"),
  to: new Date("2026-08-01T00:00:00.000Z"),
};

const query = {
  days: 30,
  includeLowConfidence: false,
  limit: 12,
};

describe("observability overview repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.dailyContentQualityAggregate.findMany.mockResolvedValue([]);
    prismaMock.dailyPerformanceAggregate.findMany.mockResolvedValue([]);
    prismaMock.dailyErrorAggregate.findMany.mockResolvedValue([]);
    prismaMock.dailyAuditAggregate.findMany.mockResolvedValue([]);
    prismaMock.errorOccurrence.findMany.mockResolvedValue([]);
    prismaMock.auditActivity.findMany.mockResolvedValue([]);
    prismaMock.contentEngagement.findMany.mockResolvedValue([]);
  });

  it("reads persisted aggregates instead of raw observability events", async () => {
    await observabilityOverviewRepository.listContentAggregates(window, {
      ...query,
      pageType: "article",
      path: "/articoli/test",
    });
    await observabilityOverviewRepository.listPerformanceAggregates(window, query);
    await observabilityOverviewRepository.listErrorAggregates(window, query);
    await observabilityOverviewRepository.listAuditAggregates(window, query);

    expect(prismaMock.dailyContentQualityAggregate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pageType: "article", path: "/articoli/test" }),
      }),
    );
    expect(prismaMock.dailyPerformanceAggregate.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.dailyErrorAggregate.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.dailyAuditAggregate.findMany).toHaveBeenCalledOnce();
    expect(prismaMock.observabilityEvent.findMany).not.toHaveBeenCalled();
  });

  it("correlates blocking errors with performance exits via interpreted tables", async () => {
    prismaMock.errorOccurrence.findMany.mockResolvedValue([
      {
        id: "occurrence-1",
        sessionId: "session-1",
        path: "/articoli/test",
        requestId: "request-1",
        correlationId: "correlation-1",
        occurredAt: new Date("2026-07-10T10:00:00.000Z"),
        errorGroup: {
          id: "group-1",
          title: "Player failed",
          severity: "HIGH",
          userImpact: "BLOCKED_ACTION",
          priorityScore: 90,
          regression: false,
        },
      },
    ]);
    prismaMock.performanceExperience.count.mockResolvedValue(1);

    const rows = await observabilityOverviewRepository.listBlockingErrorExitCandidates(window);

    expect(rows[0]?.relatedExitCount).toBe(1);
    expect(prismaMock.performanceExperience.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: "session-1",
          path: "/articoli/test",
        }),
      }),
    );
    expect(prismaMock.observabilityEvent.findMany).not.toHaveBeenCalled();
  });
});
