import {
  createIssueInputSchema,
  listIssuesQuerySchema,
  reorderIssuesInputSchema,
  updateIssueInputSchema,
} from "@/lib/server/modules/issues/schema";

describe("issues schemas", () => {
  it("applies create defaults and coerces publishedAt", () => {
    const parsed = createIssueInputSchema.parse({
      title: "  Issue 01  ",
      publishedAt: "2026-01-01T10:00:00.000Z",
    });

    expect(parsed.title).toBe("Issue 01");
    expect(parsed.isActive).toBe(true);
    expect(parsed.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects empty update payloads", () => {
    expect(updateIssueInputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects duplicate ids during issue reorder", () => {
    expect(
      reorderIssuesInputSchema.safeParse({
        orderedIssueIds: [
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000001",
        ],
      }).success,
    ).toBe(false);
  });

  it("parses query defaults and boolean filters", () => {
    const parsed = listIssuesQuerySchema.parse({ isActive: "false", published: "true" });

    expect(parsed).toMatchObject({
      isActive: false,
      published: true,
      sortBy: "sortOrder",
      sortOrder: "asc",
    });
  });
});
