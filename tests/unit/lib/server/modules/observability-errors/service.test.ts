const observabilityErrorsRepositoryMock = vi.hoisted(() => ({
  getGroupStatusById: vi.fn(),
  recordOccurrence: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-errors/repository", () => ({
  observabilityErrorsRepository: observabilityErrorsRepositoryMock,
}));

import { observabilityErrorsService } from "@/lib/server/modules/observability-errors/service";

describe("observability errors service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANALYTICS_SALT_SECRET = "test-secret";
  });

  it("derives action, impact, severity and priority from operational context", () => {
    const actionContext = observabilityErrorsService.normalizeActionContext("publish article");
    const impactArea = observabilityErrorsService.deriveImpactArea({
      path: "/cms/articles/1/edit",
      routePath: "/cms/articles/[id]/edit",
      actionContext,
    });
    const severity = observabilityErrorsService.deriveSeverity({
      source: "server",
      statusCode: 500,
      actionContext,
      impactArea,
      userImpact: "blocked_action",
    });
    const priority = observabilityErrorsService.calculatePriority({
      severity,
      userImpact: "blocked_action",
      impactArea,
      actionContext,
      statusCode: 500,
    });

    expect(actionContext).toBe("publish");
    expect(impactArea).toBe("editorial");
    expect(severity).toBe("high");
    expect(priority.score).toBe(100);
    expect(priority.reasons).toEqual(["severity:high", "blocked_action", "server_5xx"]);
  });

  it("records an occurrence with versioned fingerprint and operational fields", async () => {
    observabilityErrorsRepositoryMock.recordOccurrence.mockResolvedValue({
      id: "occurrence-1",
      errorGroupId: "group-1",
    });

    await observabilityErrorsService.recordOccurrence(
      {
        source: "boundary",
        sessionId: "obs_session_1_0000",
        name: "Error",
        message: "Render failed for article 550e8400-e29b-41d4-a716-446655440000",
        stack: "at ArticlePage (/repo/app/articoli/[slug]/page.tsx:12:4)",
        path: "/articoli/test?token=secret",
        pageType: "article",
        contentId: "article-1",
        actionContext: "article render",
        metadata: { component: "ArticlePage" },
      },
      {
        ipAddress: "203.0.113.10",
        userAgent: "Test browser",
        requestId: "request-1",
        method: "GET",
        country: "it",
      },
    );

    expect(observabilityErrorsRepositoryMock.recordOccurrence).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          id: "obs_session_1_0000",
          country: "IT",
          landingPath: "/articoli/test",
        }),
        event: expect.objectContaining({
          type: "boundary_error",
          path: "/articoli/test",
          requestId: "request-1",
        }),
        group: expect.objectContaining({
          fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/),
          fingerprintVersion: 1,
          source: "BOUNDARY",
          severity: "MEDIUM",
          impactArea: "PUBLIC_SITE",
          priorityScore: 40,
          priorityReasons: ["severity:medium"],
        }),
        occurrence: expect.objectContaining({
          sessionId: "obs_session_1_0000",
          path: "/articoli/test",
          actionContext: "unknown",
          metadata: { component: "ArticlePage" },
        }),
      }),
    );
  });

  it("validates status transitions and records operational status metadata", async () => {
    observabilityErrorsRepositoryMock.getGroupStatusById.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "OPEN",
    });
    observabilityErrorsRepositoryMock.updateStatus.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Error",
      source: "SERVER",
      severity: "HIGH",
      status: "RESOLVED",
      priorityScore: 90,
      priorityReasons: ["severity:high"],
      occurrenceCount: 1,
      affectedSessions: 0,
      affectedPaths: [],
      impactArea: "EDITORIAL",
      userImpact: "BLOCKED_ACTION",
      regression: false,
      firstSeenAt: new Date("2026-07-01T10:00:00.000Z"),
      lastSeenAt: new Date("2026-07-01T10:00:00.000Z"),
      firstRelease: null,
      lastRelease: null,
      fingerprint: "fingerprint",
      fingerprintVersion: 1,
      errorSignature: "signature",
      resolvedAt: new Date("2026-07-01T10:01:00.000Z"),
      resolvedBy: "user-1",
      reopenedAt: null,
      reopenedBy: null,
      lastStatusAt: new Date("2026-07-01T10:01:00.000Z"),
      lastStatusBy: "user-1",
    });

    const result = await observabilityErrorsService.updateStatus(
      "550e8400-e29b-41d4-a716-446655440000",
      "resolved",
      "user-1",
    );

    expect(result.status).toBe("resolved");
    expect(observabilityErrorsRepositoryMock.updateStatus).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
      "resolved",
      "user-1",
    );
  });

  it("rejects invalid status transitions", async () => {
    observabilityErrorsRepositoryMock.getGroupStatusById.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      status: "RESOLVED",
    });

    await expect(
      observabilityErrorsService.updateStatus(
        "550e8400-e29b-41d4-a716-446655440000",
        "investigating",
        "user-1",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(observabilityErrorsRepositoryMock.updateStatus).not.toHaveBeenCalled();
  });
});
