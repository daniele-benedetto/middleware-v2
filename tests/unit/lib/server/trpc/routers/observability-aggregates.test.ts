const aggregatesServiceMock = vi.hoisted(() => ({
  aggregate: vi.fn(),
  overview: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-aggregates", async () => {
  const dto = await import("@/lib/server/modules/observability-aggregates/dto");
  const schema = await import("@/lib/server/modules/observability-aggregates/schema");
  const policy = await import("@/lib/server/modules/observability-aggregates/policy");
  return {
    ...dto,
    ...schema,
    ...policy,
    observabilityAggregatesService: aggregatesServiceMock,
  };
});

import { USER_ROLES } from "@/lib/server/auth/roles";
import { observabilityAggregatesRouter } from "@/lib/server/trpc/routers/observability-aggregates";

import type { UserRole } from "@/lib/server/auth/roles";

function createCaller(role: UserRole = USER_ROLES.ADMIN) {
  return observabilityAggregatesRouter.createCaller({
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

describe("observabilityAggregatesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns aggregate overview DTO", async () => {
    aggregatesServiceMock.overview.mockResolvedValue({
      content: [],
      performance: [],
      errors: [],
      audit: [],
    });

    const result = await createCaller(USER_ROLES.EDITOR).overview({ days: 30 });

    expect(result.content).toEqual([]);
    expect(aggregatesServiceMock.overview).toHaveBeenCalledWith({ days: 30 });
  });

  it("allows admins to run aggregation jobs", async () => {
    aggregatesServiceMock.aggregate.mockResolvedValue({
      jobRunId: "11111111-1111-4111-8111-111111111111",
      domains: ["content"],
      windowStart: "2026-07-01T00:00:00.000Z",
      windowEnd: "2026-07-02T00:00:00.000Z",
      dryRun: false,
      processedRows: 1,
    });

    const result = await createCaller(USER_ROLES.ADMIN).aggregate({
      days: 1,
      domains: ["content"],
      force: false,
      dryRun: false,
    });

    expect(result.processedRows).toBe(1);
  });

  it("forbids editors from running aggregation jobs", async () => {
    await expect(
      createCaller(USER_ROLES.EDITOR).aggregate({
        days: 1,
        domains: ["content"],
        force: false,
        dryRun: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
