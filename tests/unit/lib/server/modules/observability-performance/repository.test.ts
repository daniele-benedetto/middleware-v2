const prismaMock = vi.hoisted(() => ({
  performanceExperience: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  contentEngagement: {
    findFirst: vi.fn(),
  },
  errorOccurrence: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { observabilityPerformanceRepository } from "@/lib/server/modules/observability-performance/repository";

const entry = {
  sessionId: "session-1",
  pageInstanceId: "page-1",
  visitorHash: "visitor-1",
  path: "/articoli/test",
  pageType: "article",
  metric: "lcp" as const,
  value: 1200,
  rating: "good",
  perceivedQuality: "smooth",
  causedEarlyExit: false,
  hasBlockingError: false,
  correlatedErrorCount: 0,
  qualityReasons: [],
  thresholdVersion: "performance-v1",
  sampleRate: 1,
  occurredAt: new Date("2026-07-01T10:00:00.000Z"),
};

describe("observability performance repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a performance episode when page instance is new", async () => {
    prismaMock.performanceExperience.findFirst.mockResolvedValue(null);
    prismaMock.performanceExperience.create.mockResolvedValue({ id: "perf-1" });

    await observabilityPerformanceRepository.upsertExperience(entry);

    expect(prismaMock.performanceExperience.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pageInstanceId: "page-1", lcp: 1200 }),
      }),
    );
  });

  it("merges additional metrics into an existing page instance", async () => {
    prismaMock.performanceExperience.findFirst.mockResolvedValue({
      ...entry,
      id: "perf-1",
      observabilityEventId: null,
      routePath: null,
      contentId: null,
      deviceType: null,
      browser: null,
      os: null,
      connectionType: null,
      effectiveConnectionType: null,
      saveData: null,
      viewportWidth: null,
      viewportHeight: null,
      lcp: 1200,
      inp: null,
      cls: null,
      fcp: null,
      ttfb: null,
      activeTimeMs: null,
      exitType: null,
      release: null,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      updatedAt: new Date("2026-07-01T10:00:00.000Z"),
    });
    prismaMock.performanceExperience.update.mockResolvedValue({ id: "perf-1" });

    await observabilityPerformanceRepository.upsertExperience({
      ...entry,
      metric: "inp",
      value: 250,
      rating: "needs_improvement",
    });

    expect(prismaMock.performanceExperience.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "perf-1" },
        data: expect.objectContaining({ inp: 250, rating: "needs_improvement" }),
      }),
    );
  });
});
