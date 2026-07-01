const performanceServiceMock = vi.hoisted(() => ({
  getDetail: vi.fn(),
  getSummary: vi.fn(),
  getTrend: vi.fn(),
  listWorstPages: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-performance", async () => {
  const dto = await import("@/lib/server/modules/observability-performance/dto");
  const schema = await import("@/lib/server/modules/observability-performance/schema");
  const policy = await import("@/lib/server/modules/observability-performance/policy");
  return {
    ...dto,
    ...schema,
    ...policy,
    observabilityPerformanceService: performanceServiceMock,
  };
});

import { USER_ROLES } from "@/lib/server/auth/roles";
import { performanceRouter } from "@/lib/server/trpc/routers/performance";

function createCaller() {
  return performanceRouter.createCaller({
    request: new Request("https://middleware.test/api/trpc"),
    session: {
      user: {
        id: "user-1",
        email: "admin@example.com",
        role: USER_ROLES.ADMIN,
      },
    },
  });
}

const vital = {
  metric: "lcp" as const,
  p75: 1200,
  rating: "good" as const,
  unit: "ms" as const,
  goodThreshold: 2500,
  poorThreshold: 4000,
  sampleCount: 10,
};

describe("performanceRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns summary DTO", async () => {
    performanceServiceMock.getSummary.mockResolvedValue({
      totalExperiences: 10,
      frustratingRate: 0.2,
      earlyExitCount: 1,
      sampleConfidence: "low",
      qualityBreakdown: [
        { quality: "smooth", count: 8 },
        { quality: "acceptable", count: 0 },
        { quality: "frustrating", count: 2 },
        { quality: "broken", count: 0 },
      ],
      vitals: [vital],
    });

    const result = await createCaller().summary({ days: 30 });

    expect(result.totalExperiences).toBe(10);
    expect(performanceServiceMock.getSummary).toHaveBeenCalledWith({ days: 30 });
  });

  it("lists worst pages", async () => {
    performanceServiceMock.listWorstPages.mockResolvedValue({
      items: [
        {
          path: "/articoli/test",
          pageType: "article",
          contentId: "article-1",
          sampleCount: 10,
          affectedSessions: 2,
          frustratingCount: 2,
          frustratingRate: 0.2,
          earlyExitCount: 1,
          earlyExitRate: 0.1,
          dominantDevice: "mobile",
          release: "release-1",
          sampleConfidence: "low",
          impactScore: 31,
          qualityReasons: ["lcp_poor"],
          qualityBreakdown: [{ quality: "frustrating", count: 2 }],
          vitals: [vital],
        },
      ],
      total: 1,
    });

    const result = await createCaller().worstPages({
      page: 1,
      pageSize: 20,
      query: { days: 30, sortBy: "impact", sortOrder: "desc" },
    });

    expect(result.items[0]?.path).toBe("/articoli/test");
  });

  it("returns trend", async () => {
    performanceServiceMock.getTrend.mockResolvedValue({
      metric: "lcp",
      unit: "ms",
      points: [{ date: "2026-07-01", p75: 1200, sampleCount: 10, rating: "good" }],
    });

    const result = await createCaller().trend({ days: 30, metric: "lcp" });

    expect(result.points).toHaveLength(1);
  });

  it("returns detail with timeline and segments", async () => {
    performanceServiceMock.getDetail.mockResolvedValue({
      path: "/articoli/test",
      pageType: "article",
      contentId: "article-1",
      sampleCount: 1,
      sampleConfidence: "low",
      qualityBreakdown: [{ quality: "frustrating", count: 1 }],
      vitals: [vital],
      earlyExitCount: 1,
      correlatedErrorCount: 1,
      releases: ["release-1"],
      timeline: [
        {
          occurredAt: "2026-07-01T10:00:00.000Z",
          sessionId: "session-1",
          pageInstanceId: "page-1",
          observabilityEventId: "event-1",
          rating: "poor",
          perceivedQuality: "frustrating",
          causedEarlyExit: true,
          qualityReasons: ["lcp_poor"],
        },
      ],
      deviceSegments: [{ value: "mobile", count: 1, frustratingRate: 1 }],
      connectionSegments: [{ value: "4g", count: 1, frustratingRate: 1 }],
      qualityReasons: ["lcp_poor"],
    });

    const result = await createCaller().detail({ days: 30, path: "/articoli/test" });

    expect(result.timeline[0]?.sessionId).toBe("session-1");
    expect(result.deviceSegments[0]?.value).toBe("mobile");
  });
});
