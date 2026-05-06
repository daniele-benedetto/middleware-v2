const issuesRepositoryMock = vi.hoisted(() => ({
  list: vi.fn(),
  count: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  updateWithArticleOrder: vi.fn(),
  delete: vi.fn(),
  listIdsOrderedBySortOrder: vi.fn(),
  reorder: vi.fn(),
}));

vi.mock("@/lib/server/modules/issues/repository", () => ({
  ISSUE_ARTICLE_ORDER_MISMATCH: "ISSUE_ARTICLE_ORDER_MISMATCH",
  issuesRepository: issuesRepositoryMock,
}));

import { issuesService } from "@/lib/server/modules/issues/service";
import { createPrismaKnownRequestError } from "@/tests/helpers/create-prisma-known-request-error";

function createIssueRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-1",
    title: "Issue 01",
    slug: "issue-01",
    description: null,
    isActive: true,
    sortOrder: 1,
    publishedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    _count: { articles: 2 },
    ...overrides,
  };
}

describe("issuesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries issue creation with incremented slug suffixes on unique collisions", async () => {
    issuesRepositoryMock.create
      .mockRejectedValueOnce(createPrismaKnownRequestError("P2002", "duplicate"))
      .mockResolvedValueOnce({ id: "issue-1" });
    issuesRepositoryMock.getById.mockResolvedValue(createIssueRecord());

    const result = await issuesService.create({
      title: "Issue 01",
      description: null,
      isActive: true,
      publishedAt: null,
    });

    expect(issuesRepositoryMock.create).toHaveBeenNthCalledWith(1, {
      title: "Issue 01",
      slug: "issue-01",
      description: null,
      isActive: true,
      publishedAt: null,
    });
    expect(issuesRepositoryMock.create).toHaveBeenNthCalledWith(2, {
      title: "Issue 01",
      slug: "issue-01-1",
      description: null,
      isActive: true,
      publishedAt: null,
    });
    expect(result).toMatchObject({ id: "issue-1", slug: "issue-01" });
  });

  it("maps article order mismatch errors on update", async () => {
    issuesRepositoryMock.updateWithArticleOrder.mockRejectedValue(
      new Error("ISSUE_ARTICLE_ORDER_MISMATCH"),
    );

    await expect(
      issuesService.update("issue-1", { title: "Issue 01" }, ["article-1"]),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      details: { reason: "ISSUE_ARTICLE_ORDER_MISMATCH" },
    });
  });

  it("maps delete relation errors to a domain conflict", async () => {
    issuesRepositoryMock.delete.mockRejectedValue(
      createPrismaKnownRequestError("P2003", "fk constraint"),
    );

    await expect(issuesService.delete("issue-1")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      details: { reason: "ISSUE_DELETE_HAS_ARTICLES" },
    });
  });

  it("rejects reorder payloads that do not match the existing issue set", async () => {
    issuesRepositoryMock.listIdsOrderedBySortOrder.mockResolvedValue([
      { id: "issue-1" },
      { id: "issue-2" },
    ]);

    await expect(
      issuesService.reorder({ orderedIssueIds: ["issue-1", "issue-3"] }),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "orderedIssueIds must include all and only existing issues",
    });
    expect(issuesRepositoryMock.reorder).not.toHaveBeenCalled();
  });
});
