const articleFindFirstMock = vi.hoisted(() => vi.fn());
const queryRawMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findFirst: articleFindFirstMock },
    $queryRaw: queryRawMock,
  },
}));

import { publicMediaRepository } from "@/lib/server/modules/media/repository/public";

describe("publicMediaRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    articleFindFirstMock.mockResolvedValue(null);
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
});
