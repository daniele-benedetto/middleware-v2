const articleFindFirstMock = vi.hoisted(() => vi.fn());
const lessonFindFirstMock = vi.hoisted(() => vi.fn());
const queryRawMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findFirst: articleFindFirstMock },
    lesson: { findFirst: lessonFindFirstMock },
    $queryRaw: queryRawMock,
  },
}));

import { publicMediaRepository } from "@/lib/server/modules/media/repository/public";

describe("publicMediaRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    articleFindFirstMock.mockResolvedValue(null);
    lessonFindFirstMock.mockResolvedValue(null);
    queryRawMock.mockResolvedValue([]);
  });

  it("authorizes media referenced by published article rich text", async () => {
    queryRawMock.mockResolvedValueOnce([{ id: "article-1" }]);

    await expect(
      publicMediaRepository.hasPublishedArticleMedia("marocco-italia.jpeg"),
    ).resolves.toBe(true);

    expect(articleFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { imageUrl: { in: expect.arrayContaining(["marocco-italia.jpeg"]) } },
            { audioUrl: { in: expect.arrayContaining(["marocco-italia.jpeg"]) } },
          ],
        }),
      }),
    );
    expect(queryRawMock).toHaveBeenCalled();
  });

  it("checks raw and encoded media URL references", async () => {
    queryRawMock.mockImplementation((_strings, reference) =>
      reference === "/api/public/media/blob?pathname=covers%2Fhero%20image.jpg"
        ? Promise.resolve([{ id: "article-1" }])
        : Promise.resolve([]),
    );

    await expect(
      publicMediaRepository.hasPublishedArticleMedia("covers/hero image.jpg"),
    ).resolves.toBe(true);

    expect(articleFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              imageUrl: {
                in: expect.arrayContaining([
                  "covers/hero image.jpg",
                  "/api/public/media/blob?pathname=covers%2Fhero%20image.jpg",
                  "/api/public/media/blob?pathname=covers%2Fhero+image.jpg",
                  "/api/cms/media/blob?pathname=covers%2Fhero+image.jpg&download=1",
                  "https://middleware.media/api/public/media/blob?pathname=covers%2Fhero+image.jpg",
                ]),
              },
            },
            { audioUrl: { in: expect.any(Array) } },
          ],
        }),
      }),
    );
  });

  it("does not authorize a pathname that is only a substring of a published reference", async () => {
    const publishedReference = "/api/public/media/blob?pathname=covers%2Fnot-secret.jpg";
    articleFindFirstMock.mockImplementation(({ where }) =>
      where.OR.some(
        ({ imageUrl, audioUrl }: { imageUrl?: { in: string[] }; audioUrl?: { in: string[] } }) =>
          (imageUrl?.in ?? audioUrl?.in)?.includes(publishedReference),
      )
        ? Promise.resolve({ id: "article-1" })
        : Promise.resolve(null),
    );
    queryRawMock.mockImplementation((_strings, reference) =>
      reference === publishedReference
        ? Promise.resolve([{ id: "article-1" }])
        : Promise.resolve([]),
    );

    await expect(publicMediaRepository.hasPublishedArticleMedia("covers/secret.jpg")).resolves.toBe(
      false,
    );

    const sql = queryRawMock.mock.calls.map(([strings]) => strings.join("?")).join("\n");
    expect(sql).toContain("jsonb_path_exists");
    expect(sql).toContain("$.**.attrs.src");
    expect(sql).toContain("$.**.attrs.href");
    expect(sql).not.toContain("strict $.** ?");
    expect(sql).not.toContain("LIKE");
    expect(queryRawMock.mock.calls.flatMap(([, reference]) => reference)).not.toContain(
      publishedReference,
    );
  });

  it("does not authorize ordinary rich-text content that equals a private pathname", async () => {
    await expect(publicMediaRepository.hasPublishedArticleMedia("private/notes.txt")).resolves.toBe(
      false,
    );

    const sql = queryRawMock.mock.calls.map(([strings]) => strings.join("?")).join("\n");
    expect(sql).toContain("attrs.src");
    expect(sql).toContain("attrs.href");
    expect(sql).not.toContain("strict $.** ? (@ == $reference)");
  });

  it("does not query rich text when direct article media matches", async () => {
    articleFindFirstMock.mockResolvedValue({ id: "article-1" });

    await expect(publicMediaRepository.hasPublishedArticleMedia("covers/hero.jpg")).resolves.toBe(
      true,
    );

    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("authorizes media referenced directly by a published lesson", async () => {
    lessonFindFirstMock.mockResolvedValue({ id: "lesson-1" });

    await expect(
      publicMediaRepository.hasPublishedLessonMedia("contesto-e-origini.mp3"),
    ).resolves.toBe(true);

    expect(lessonFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: { not: null },
          course: { isActive: true, publishedAt: { not: null } },
          OR: [
            { imageUrl: { in: expect.arrayContaining(["contesto-e-origini.mp3"]) } },
            { audioUrl: { in: expect.arrayContaining(["contesto-e-origini.mp3"]) } },
          ],
        }),
      }),
    );
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("authorizes media referenced by published lesson rich text", async () => {
    queryRawMock.mockResolvedValueOnce([{ id: "lesson-1" }]);

    await expect(publicMediaRepository.hasPublishedLessonMedia("slides/intro.jpg")).resolves.toBe(
      true,
    );

    expect(lessonFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { imageUrl: { in: expect.arrayContaining(["slides/intro.jpg"]) } },
            { audioUrl: { in: expect.arrayContaining(["slides/intro.jpg"]) } },
          ],
        }),
      }),
    );
    expect(queryRawMock).toHaveBeenCalled();
  });

  it("authorizes an exact encoded page rich-text reference", async () => {
    queryRawMock.mockImplementation((_strings, reference) =>
      reference === "/api/public/media/blob?pathname=pages%2Fcover.jpg"
        ? Promise.resolve([{ id: "page-1" }])
        : Promise.resolve([]),
    );

    await expect(publicMediaRepository.hasPublishedPageImage("pages/cover.jpg")).resolves.toBe(
      true,
    );
  });
});
