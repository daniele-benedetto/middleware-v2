const observabilityAuditRepositoryMock = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
  summary: vi.fn(),
  getById: vi.fn(),
  listRelatedErrors: vi.fn(),
}));

vi.mock("@/lib/server/modules/observability-audit/repository", () => ({
  observabilityAuditRepository: observabilityAuditRepositoryMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import { observabilityAuditService } from "@/lib/server/modules/observability-audit/service";

describe("observability audit service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observabilityAuditRepositoryMock.create.mockResolvedValue({ id: "activity-1" });
  });

  it("records public publish success as high risk with applied changes", async () => {
    const before = observabilityAuditService.createAuditSnapshot({
      title: "Draft article",
      values: { id: "article-1", status: "DRAFT", title: "Draft article" },
    });
    const after = observabilityAuditService.createAuditSnapshot({
      title: "Published article",
      publicFlags: ["published"],
      values: { id: "article-1", status: "PUBLISHED", title: "Published article" },
    });

    await observabilityAuditService.recordSuccess({
      action: "publish",
      resourceType: "article",
      resourceId: "article-1",
      actor: { id: "user-1", email: "admin@example.test", name: "Admin", role: "ADMIN" },
      before,
      after,
      context: { requestId: "req-1" },
    });

    expect(observabilityAuditRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "SUCCESS",
        riskLevel: "high",
        publicImpact: true,
        changedFields: expect.arrayContaining(["status", "title"]),
        beforeSummary: expect.any(Object),
        afterSummary: expect.any(Object),
        attemptedSummary: null,
      }),
    );
    expect(observabilityAuditRepositoryMock.create.mock.calls[0][0].changes.length).toBeGreaterThan(
      0,
    );
  });

  it("records failed role change as critical attempted activity without applied changes", async () => {
    const before = observabilityAuditService.createAuditSnapshot({
      title: "editor@example.test",
      values: { id: "user-2", role: "EDITOR" },
    });
    const attempted = observabilityAuditService.createAuditAttemptSnapshot({
      resourceType: "user",
      title: "user-2",
      values: { role: "ADMIN", password: "secret" },
    });

    await observabilityAuditService.recordFailure({
      action: "change_role",
      resourceType: "user",
      resourceId: "user-2",
      actor: { id: "admin-1", email: "admin@example.test", name: null, role: "ADMIN" },
      before,
      attempted,
      context: { requestId: "req-2" },
      error: new Error("Forbidden"),
    });

    expect(observabilityAuditRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "FAILURE",
        riskLevel: "critical",
        publicImpact: false,
        changedFields: [],
        beforeSummary: null,
        afterSummary: null,
        attemptedSummary: expect.any(Object),
        errorMessage: "Forbidden",
        changes: [],
      }),
    );
    expect(JSON.stringify(observabilityAuditRepositoryMock.create.mock.calls[0][0])).not.toContain(
      "secret",
    );
  });
});
