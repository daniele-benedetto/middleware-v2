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
          OR: expect.arrayContaining([
            { imageUrl: { contains: "marocco-italia.jpeg" } },
            { audioUrl: { contains: "marocco-italia.jpeg" } },
          ]),
        }),
      }),
    );
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("checks encoded rich text references when the pathname contains unsafe URL characters", async () => {
    queryRawMock.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "article-1" }]);

    await expect(
      publicMediaRepository.hasPublishedArticleMedia("covers/hero image.jpg"),
    ).resolves.toBe(true);

    expect(queryRawMock).toHaveBeenCalledTimes(2);
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
          OR: expect.arrayContaining([
            { imageUrl: { contains: "contesto-e-origini.mp3" } },
            { audioUrl: { contains: "contesto-e-origini.mp3" } },
          ]),
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
          OR: expect.arrayContaining([
            { imageUrl: { contains: "slides/intro.jpg" } },
            { audioUrl: { contains: "slides/intro.jpg" } },
          ]),
        }),
      }),
    );
    expect(queryRawMock).toHaveBeenCalledTimes(2);
  });
});
