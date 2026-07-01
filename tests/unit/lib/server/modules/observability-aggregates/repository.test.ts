const prismaMock = vi.hoisted(() => ({
  observabilityJobRun: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  dailyContentQualityAggregate: {
    count: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  dailyPerformanceAggregate: { deleteMany: vi.fn() },
  dailyErrorAggregate: { deleteMany: vi.fn() },
  dailyAuditAggregate: { deleteMany: vi.fn() },
  observabilityEvent: { deleteMany: vi.fn() },
  contentEngagement: { deleteMany: vi.fn(), findMany: vi.fn() },
  audioEngagement: { deleteMany: vi.fn(), findMany: vi.fn() },
  performanceExperience: { deleteMany: vi.fn(), findMany: vi.fn() },
  errorOccurrence: { deleteMany: vi.fn(), findMany: vi.fn() },
  auditActivity: { findMany: vi.fn() },
  $transaction: vi.fn(async (input) => {
    if (typeof input === "function") return input(prismaMock);
    return Promise.all(input);
  }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { observabilityAggregatesRepository } from "@/lib/server/modules/observability-aggregates/repository";

describe("observability aggregates repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a job run when no live lock exists", async () => {
    prismaMock.observabilityJobRun.findFirst.mockResolvedValue(null);
    prismaMock.observabilityJobRun.create.mockResolvedValue({ id: "job-1" });

    const result = await observabilityAggregatesRepository.acquireJobRun({
      jobName: "observability:aggregate",
      domain: "content",
      window: {
        start: new Date("2026-07-01T00:00:00.000Z"),
        end: new Date("2026-07-02T00:00:00.000Z"),
      },
      lockMs: 1000,
    });

    expect(result).toEqual({ id: "job-1" });
    expect(prismaMock.observabilityJobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ domain: "CONTENT" }) }),
    );
  });

  it("returns null when a live lock exists", async () => {
    prismaMock.observabilityJobRun.findFirst.mockResolvedValue({ id: "job-1" });

    await expect(
      observabilityAggregatesRepository.acquireJobRun({
        jobName: "observability:aggregate",
        domain: "content",
        window: {
          start: new Date("2026-07-01T00:00:00.000Z"),
          end: new Date("2026-07-02T00:00:00.000Z"),
        },
        lockMs: 1000,
      }),
    ).resolves.toBeNull();

    expect(prismaMock.observabilityJobRun.create).not.toHaveBeenCalled();
  });

  it("replaces content aggregate windows with delete then insert", async () => {
    prismaMock.dailyContentQualityAggregate.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.dailyContentQualityAggregate.createMany.mockResolvedValue({ count: 1 });

    const rows = [
      {
        date: new Date("2026-07-01T00:00:00.000Z"),
        pageType: "article",
        contentType: "article",
        contentId: "article-1",
        path: "/articoli/test",
        thresholdVersion: "content-quality-v1",
      },
    ];

    await observabilityAggregatesRepository.replaceContentAggregates(
      {
        start: new Date("2026-07-01T00:00:00.000Z"),
        end: new Date("2026-07-02T00:00:00.000Z"),
      },
      rows,
    );

    expect(prismaMock.dailyContentQualityAggregate.deleteMany).toHaveBeenCalledOnce();
    expect(prismaMock.dailyContentQualityAggregate.createMany).toHaveBeenCalledWith({ data: rows });
  });

  it("prunes only configured retention buckets", async () => {
    prismaMock.observabilityEvent.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.contentEngagement.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.audioEngagement.deleteMany.mockResolvedValue({ count: 3 });
    prismaMock.performanceExperience.deleteMany.mockResolvedValue({ count: 4 });
    prismaMock.errorOccurrence.deleteMany.mockResolvedValue({ count: 5 });
    prismaMock.dailyContentQualityAggregate.deleteMany.mockResolvedValue({ count: 6 });
    prismaMock.dailyPerformanceAggregate.deleteMany.mockResolvedValue({ count: 7 });
    prismaMock.dailyErrorAggregate.deleteMany.mockResolvedValue({ count: 8 });
    prismaMock.dailyAuditAggregate.deleteMany.mockResolvedValue({ count: 9 });

    const result = await observabilityAggregatesRepository.prune({
      raw: new Date("2026-01-01T00:00:00.000Z"),
      interpreted: new Date("2026-02-01T00:00:00.000Z"),
      errorOccurrences: new Date("2026-03-01T00:00:00.000Z"),
      aggregates: new Date("2025-01-01T00:00:00.000Z"),
    });

    expect(result).toMatchObject({
      events: 1,
      contentEngagements: 2,
      audioEngagements: 3,
      performanceExperiences: 4,
      errorOccurrences: 5,
      contentAggregates: 6,
      performanceAggregates: 7,
      errorAggregates: 8,
      auditAggregates: 9,
    });
  });
});
