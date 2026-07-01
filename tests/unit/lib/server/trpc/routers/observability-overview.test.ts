const overviewServiceMock = vi.hoisted(() => ({
  overview: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-overview", async () => {
  const dto = await import("@/lib/server/modules/observability-overview/dto");
  const schema = await import("@/lib/server/modules/observability-overview/schema");
  const policy = await import("@/lib/server/modules/observability-overview/policy");
  return {
    ...dto,
    ...schema,
    ...policy,
    observabilityOverviewService: overviewServiceMock,
  };
});

import { USER_ROLES } from "@/lib/server/auth/roles";
import { observabilityOverviewRouter } from "@/lib/server/trpc/routers/observability-overview";

function createCaller(role = USER_ROLES.ADMIN) {
  return observabilityOverviewRouter.createCaller({
    request: new Request("https://middleware.test/api/trpc"),
    session: {
      user: {
        id: "user-1",
        email: "admin@example.com",
        role,
      },
    },
  });
}

const overviewDto = {
  period: { from: "2026-07-01T00:00:00.000Z", to: "2026-07-31T00:00:00.000Z", days: 30 },
  healthScore: {
    score: 72,
    status: "watch",
    confidence: "high",
    components: [{ label: "versione scoring", value: "observability-insights-v1", unit: null }],
    penalties: [{ label: "errori critical/high", value: 8, unit: null }],
    bonuses: [{ label: "qualita contenuti", value: 2, unit: null }],
    reasons: ["critical_high_errors"],
  },
  kpis: {
    qualifiedVisits: 10,
    completedReads: 4,
    averageQualityScore: 70,
    frustratingOrBrokenExperiences: 2,
    criticalHighErrors: 1,
    errorRegressions: 0,
    highCriticalAuditActivities: 0,
    sensitiveAuditFailures: 0,
  },
  watchFirst: [],
  insights: [],
  trends: [],
  confidence: "high",
} as const;

describe("observabilityOverviewRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns overview DTO", async () => {
    overviewServiceMock.overview.mockResolvedValue(overviewDto);

    const result = await createCaller().overview({
      days: 30,
      includeLowConfidence: false,
      limit: 12,
    });

    expect(result.healthScore.score).toBe(72);
    expect(overviewServiceMock.overview).toHaveBeenCalledWith({
      days: 30,
      includeLowConfidence: false,
      limit: 12,
    });
  });

  it("rejects roles outside overview policy", async () => {
    await expect(
      createCaller("VIEWER" as never).overview({
        days: 30,
        includeLowConfidence: false,
        limit: 12,
      }),
    ).rejects.toThrow();
  });
});
