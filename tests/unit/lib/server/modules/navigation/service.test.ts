const navigationRepositoryMock = vi.hoisted(() => ({
  listMenus: vi.fn(),
  getByKey: vi.fn(),
  upsertMenu: vi.fn(),
  listPublishedPages: vi.fn(),
  listPublishedArticles: vi.fn(),
  listPublishedIssues: vi.fn(),
  findPublishedPagesByIds: vi.fn(),
  findPublishedArticlesByIds: vi.fn(),
  findPublishedIssuesByIds: vi.fn(),
}));

vi.mock("@/lib/server/modules/navigation/repository", () => ({
  navigationRepository: navigationRepositoryMock,
}));

import { navigationService } from "@/lib/server/modules/navigation/service";

const pageId = "11111111-1111-4111-8111-111111111111";
const articleId = "22222222-2222-4222-8222-222222222222";
const issueId = "33333333-3333-4333-8333-333333333333";

function menuRecord(key: string, items: unknown) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    key,
    label: key,
    items,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

describe("navigationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationRepositoryMock.listMenus.mockResolvedValue([
      menuRecord("main", { version: 1, items: [] }),
      menuRecord("footer_sections", { version: 1, items: [] }),
      menuRecord("footer_legal", { version: 1, items: [] }),
    ]);
    navigationRepositoryMock.findPublishedPagesByIds.mockResolvedValue([]);
    navigationRepositoryMock.findPublishedArticlesByIds.mockResolvedValue([]);
    navigationRepositoryMock.findPublishedIssuesByIds.mockResolvedValue([]);
  });

  it("rejects unsafe custom links on update", async () => {
    await expect(
      navigationService.update({
        key: "main",
        items: [{ id: "item-1", type: "custom", label: "Bad", href: "javascript:alert(1)" }],
      }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

    expect(navigationRepositoryMock.upsertMenu).not.toHaveBeenCalled();
  });

  it("resolves public navigation in document order", async () => {
    navigationRepositoryMock.listMenus.mockResolvedValue([
      menuRecord("main", {
        version: 1,
        items: [
          { id: "home", type: "home", label: "Home" },
          { id: "page", type: "page", label: "About", resourceId: pageId },
          { id: "article", type: "article", label: "Story", resourceId: articleId },
          { id: "issue", type: "issue", label: "Issue", resourceId: issueId },
          { id: "custom", type: "custom", label: "External", href: "https://example.com" },
        ],
      }),
      menuRecord("footer_sections", { version: 1, items: [] }),
      menuRecord("footer_legal", { version: 1, items: [] }),
    ]);
    navigationRepositoryMock.findPublishedPagesByIds.mockResolvedValue([
      { id: pageId, slug: "chi-siamo" },
    ]);
    navigationRepositoryMock.findPublishedArticlesByIds.mockResolvedValue([
      { id: articleId, slug: "editoriale" },
    ]);
    navigationRepositoryMock.findPublishedIssuesByIds.mockResolvedValue([
      { id: issueId, slug: "numero-1" },
    ]);

    const result = await navigationService.getPublicNavigation();

    expect(result.main).toEqual([
      { id: "home", label: "Home", href: "/", external: false },
      { id: "page", label: "About", href: "/chi-siamo", external: false },
      { id: "article", label: "Story", href: "/articoli/editoriale", external: false },
      { id: "issue", label: "Issue", href: "/uscite/numero-1", external: false },
      { id: "custom", label: "External", href: "https://example.com", external: true },
    ]);
  });

  it("skips unpublished or missing resource items", async () => {
    navigationRepositoryMock.listMenus.mockResolvedValue([
      menuRecord("main", {
        version: 1,
        items: [
          { id: "page", type: "page", label: "Missing", resourceId: pageId },
          { id: "archive", type: "archive", label: "Archivio" },
        ],
      }),
      menuRecord("footer_sections", { version: 1, items: [] }),
      menuRecord("footer_legal", { version: 1, items: [] }),
    ]);

    const result = await navigationService.getPublicNavigation();

    expect(result.main).toEqual([
      { id: "archive", label: "Archivio", href: "/uscite", external: false },
    ]);
  });

  it("returns empty public navigation for empty menu documents", async () => {
    const result = await navigationService.getPublicNavigation();

    expect(result).toEqual({ main: [], footerSections: [], footerLegal: [] });
  });
});
