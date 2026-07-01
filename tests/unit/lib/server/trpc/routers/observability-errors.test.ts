const observabilityErrorsServiceMock = vi.hoisted(() => ({
  getGroupById: vi.fn(),
  listGroups: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-errors", async () => {
  const dto = await import("@/lib/server/modules/observability-errors/dto");
  const schema = await import("@/lib/server/modules/observability-errors/schema");
  const policy = await import("@/lib/server/modules/observability-errors/policy");
  return {
    ...dto,
    ...schema,
    ...policy,
    observabilityErrorsService: observabilityErrorsServiceMock,
  };
});

import { USER_ROLES } from "@/lib/server/auth/roles";
import { observabilityErrorsRouter } from "@/lib/server/trpc/routers/observability-errors";

const group = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Publish failed",
  source: "server" as const,
  severity: "high" as const,
  status: "open" as const,
  priorityScore: 90,
  priorityReasons: ["severity:high", "blocked_action"],
  occurrenceCount: 2,
  affectedSessions: 1,
  affectedPaths: ["/cms/articles/1/edit"],
  impactArea: "editorial" as const,
  userImpact: "blocked_action" as const,
  regression: false,
  firstSeenAt: "2026-07-01T10:00:00.000Z",
  lastSeenAt: "2026-07-01T10:05:00.000Z",
  firstRelease: "release-1",
  lastRelease: "release-1",
};

function createCaller() {
  return observabilityErrorsRouter.createCaller({
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

describe("observabilityErrorsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists operational errors with filters and priority sort", async () => {
    observabilityErrorsServiceMock.listGroups.mockResolvedValue({ items: [group], total: 1 });

    const result = await createCaller().list({
      page: 1,
      pageSize: 20,
      query: {
        status: "open",
        impactArea: "editorial",
        sortBy: "priorityScore",
        sortOrder: "desc",
      },
    });

    expect(result.items[0]).toEqual(group);
    expect(observabilityErrorsServiceMock.listGroups).toHaveBeenCalledWith(
      expect.objectContaining({ status: "open", impactArea: "editorial" }),
      { page: 1, pageSize: 20 },
    );
  });

  it("returns detail with occurrences", async () => {
    observabilityErrorsServiceMock.getGroupById.mockResolvedValue({
      ...group,
      fingerprint: "fingerprint",
      fingerprintVersion: 1,
      errorSignature: "signature",
      resolvedAt: null,
      resolvedBy: null,
      reopenedAt: null,
      reopenedBy: null,
      lastStatusAt: "2026-07-01T10:00:00.000Z",
      lastStatusBy: null,
      occurrences: [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          sessionId: "session-1",
          requestId: "request-1",
          correlationId: null,
          path: "/cms/articles/1/edit",
          routePath: "/cms/articles/[id]/edit",
          routeType: "render",
          method: "POST",
          statusCode: 500,
          actionContext: "publish",
          userAgent: "Test browser",
          deviceType: null,
          browser: null,
          os: null,
          stackTraceRedacted: "stack",
          metadata: null,
          occurredAt: "2026-07-01T10:00:00.000Z",
        },
      ],
    });

    const result = await createCaller().detail({ id: group.id });

    expect(result.occurrences).toHaveLength(1);
    expect(result.fingerprintVersion).toBe(1);
  });

  it("updates status through the service", async () => {
    observabilityErrorsServiceMock.updateStatus.mockResolvedValue({ ...group, status: "resolved" });

    const result = await createCaller().updateStatus({ id: group.id, status: "resolved" });

    expect(result.status).toBe("resolved");
    expect(observabilityErrorsServiceMock.updateStatus).toHaveBeenCalledWith(
      group.id,
      "resolved",
      "user-1",
    );
  });
});
