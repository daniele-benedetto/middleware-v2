const articlesRepositoryMock = vi.hoisted(() => ({
  listMediaReferences: vi.fn(),
  replaceMediaUrl: vi.fn(),
  clearMediaUrl: vi.fn(),
}));

const lessonsRepositoryMock = vi.hoisted(() => ({
  listMediaReferences: vi.fn(),
  replaceMediaUrl: vi.fn(),
  clearMediaUrl: vi.fn(),
}));

const mediaRepositoryMock = vi.hoisted(() => ({
  listAll: vi.fn(),
  head: vi.fn(),
  rename: vi.fn(),
  delete: vi.fn(),
}));

const publicMediaRepositoryMock = vi.hoisted(() => ({
  hasPublishedArticleMedia: vi.fn(),
  hasPublishedPageImage: vi.fn(),
}));

vi.mock("@/lib/server/modules/articles/repository", () => ({
  articlesRepository: articlesRepositoryMock,
}));

vi.mock("@/lib/server/modules/lessons/repository", () => ({
  lessonsRepository: lessonsRepositoryMock,
}));

vi.mock("@/lib/server/modules/media/repository", () => ({
  mediaRepository: mediaRepositoryMock,
}));

vi.mock("@/lib/server/modules/media/repository/public", () => ({
  publicMediaRepository: publicMediaRepositoryMock,
}));

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

import { mediaService } from "@/lib/server/modules/media/service";
import { publicMediaService } from "@/lib/server/modules/media/service/public";
import {
  StorageAccessError,
  StorageConflictError,
  StorageNotFoundError,
} from "@/lib/server/storage/errors";

function createBlobRecord(overrides: Record<string, unknown> = {}) {
  return {
    url: "/api/public/media/blob?pathname=covers%2Fhero-image.jpg",
    downloadUrl: "/api/cms/media/blob?pathname=covers%2Fhero-image.jpg&download=1",
    pathname: "covers/hero-image.jpg",
    contentType: "image/jpeg",
    size: 1024,
    uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    etag: "etag-1",
    ...overrides,
  };
}

describe("mediaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    articlesRepositoryMock.listMediaReferences.mockResolvedValue([]);
    articlesRepositoryMock.replaceMediaUrl.mockResolvedValue([]);
    articlesRepositoryMock.clearMediaUrl.mockResolvedValue([]);
  });

  it("lists media sorted by uploadedAt and attaches article references", async () => {
    const olderBlob = createBlobRecord({
      url: "/api/public/media/blob?pathname=covers%2Folder.jpg",
      downloadUrl: "/api/cms/media/blob?pathname=covers%2Folder.jpg&download=1",
      pathname: "covers/older.jpg",
      uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newerBlob = createBlobRecord({
      url: "/api/public/media/blob?pathname=covers%2Fnewer.jpg",
      downloadUrl: "/api/cms/media/blob?pathname=covers%2Fnewer.jpg&download=1",
      pathname: "covers/newer.jpg",
      uploadedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    mediaRepositoryMock.listAll.mockResolvedValue([olderBlob, newerBlob]);
    articlesRepositoryMock.listMediaReferences.mockResolvedValue([
      {
        id: "article-1",
        title: "Article 1",
        imageUrl: newerBlob.url,
        audioUrl: null,
        audioChunks: null,
      },
    ]);

    const result = await mediaService.list();

    expect(result.items.map((item) => item.pathname)).toEqual([
      "covers/newer.jpg",
      "covers/older.jpg",
    ]);
    expect(result.items[0]?.articleReferences).toEqual([
      {
        id: "article-1",
        title: "Article 1",
        field: "imageUrl",
      },
    ]);
  });

  it("rejects rename when the sanitized file name becomes empty", async () => {
    await expect(
      mediaService.rename({
        url: "/api/public/media/blob?pathname=covers%2Fhero-image.jpg",
        name: "!!!",
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "File name is required",
    });
  });

  it("returns the current file unchanged when rename is a no-op", async () => {
    const current = createBlobRecord();
    mediaRepositoryMock.head.mockResolvedValue(current);

    const result = await mediaService.rename({
      url: current.url,
      name: "Hero Image",
    });

    expect(mediaRepositoryMock.rename).not.toHaveBeenCalled();
    expect(result).toEqual({
      item: expect.objectContaining({ pathname: "covers/hero-image.jpg" }),
      articleIds: [],
    });
  });

  it("rolls back the renamed blob if article URL synchronization fails", async () => {
    const current = createBlobRecord();
    const renamed = createBlobRecord({
      url: "/api/public/media/blob?pathname=covers%2Fhero-image-2.jpg",
      downloadUrl: "/api/cms/media/blob?pathname=covers%2Fhero-image-2.jpg&download=1",
      pathname: "covers/hero-image-2.jpg",
      etag: "etag-2",
    });

    mediaRepositoryMock.head.mockResolvedValue(current);
    mediaRepositoryMock.rename.mockResolvedValue(renamed);
    mediaRepositoryMock.delete.mockResolvedValue(undefined);
    articlesRepositoryMock.replaceMediaUrl.mockRejectedValue(new Error("sync failed"));

    await expect(
      mediaService.rename({
        url: current.url,
        name: "Hero Image 2",
      }),
    ).rejects.toThrow("sync failed");
    expect(mediaRepositoryMock.delete).toHaveBeenCalledWith(renamed.url, renamed);
  });

  it("maps storage access errors on list", async () => {
    mediaRepositoryMock.listAll.mockRejectedValue(new StorageAccessError());

    await expect(mediaService.list()).rejects.toMatchObject({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Unable to access media storage",
    });
  });

  it("maps not found errors on delete", async () => {
    mediaRepositoryMock.head.mockRejectedValue(new StorageNotFoundError());

    await expect(
      mediaService.delete({ url: "/api/public/media/blob?pathname=covers%2Fmissing.jpg" }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "File not found",
    });
  });

  it("maps precondition failures on delete to conflict", async () => {
    const current = createBlobRecord();
    mediaRepositoryMock.head.mockResolvedValue(current);
    mediaRepositoryMock.delete.mockRejectedValue(new StorageConflictError("stale etag"));

    await expect(mediaService.delete({ url: current.url })).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "The selected file changed during the operation",
    });
  });

  it("deletes media and clears linked article urls", async () => {
    const current = createBlobRecord();
    mediaRepositoryMock.head.mockResolvedValue(current);
    mediaRepositoryMock.delete.mockResolvedValue(undefined);
    articlesRepositoryMock.clearMediaUrl.mockResolvedValue(["article-1", "article-2"]);

    const result = await mediaService.delete({ url: current.url });

    expect(mediaRepositoryMock.delete).toHaveBeenCalledWith(current.url, current);
    expect(articlesRepositoryMock.clearMediaUrl).toHaveBeenCalledWith(current.url);
    expect(result).toEqual({ success: true, articleIds: ["article-1", "article-2"] });
  });
});

describe("publicMediaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicMediaRepositoryMock.hasPublishedArticleMedia.mockResolvedValue(false);
    publicMediaRepositoryMock.hasPublishedPageImage.mockResolvedValue(false);
  });

  it("authorizes published article image pathnames through targeted repository lookup", async () => {
    publicMediaRepositoryMock.hasPublishedArticleMedia.mockResolvedValue(true);

    await expect(
      publicMediaService.canServePublishedArticleImage("covers/hero-image.jpg"),
    ).resolves.toBe(true);

    expect(publicMediaRepositoryMock.hasPublishedArticleMedia).toHaveBeenCalledWith(
      "covers/hero-image.jpg",
    );
    expect(publicMediaRepositoryMock.hasPublishedPageImage).not.toHaveBeenCalled();
  });

  it("authorizes images referenced by published page rich text", async () => {
    publicMediaRepositoryMock.hasPublishedPageImage
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    await expect(publicMediaService.canServePublishedImage("pages/about.jpg")).resolves.toBe(true);
    await expect(publicMediaService.canServePublishedImage("pages/other.jpg")).resolves.toBe(false);

    expect(publicMediaRepositoryMock.hasPublishedPageImage).toHaveBeenCalledWith("pages/about.jpg");
    expect(publicMediaRepositoryMock.hasPublishedPageImage).toHaveBeenCalledWith("pages/other.jpg");
  });

  it("does not consult published page content for audio pathnames", async () => {
    publicMediaRepositoryMock.hasPublishedArticleMedia.mockResolvedValue(true);

    await expect(publicMediaService.canServePublishedMedia("audio/story.mp3")).resolves.toBe(true);

    expect(publicMediaRepositoryMock.hasPublishedArticleMedia).toHaveBeenCalledWith(
      "audio/story.mp3",
    );
    expect(publicMediaRepositoryMock.hasPublishedPageImage).not.toHaveBeenCalled();
  });

  it("rejects non-image pathnames before consulting published records", async () => {
    await expect(publicMediaService.canServePublishedArticleImage("data/file.json")).resolves.toBe(
      false,
    );

    expect(publicMediaRepositoryMock.hasPublishedArticleMedia).not.toHaveBeenCalled();
    expect(publicMediaRepositoryMock.hasPublishedPageImage).not.toHaveBeenCalled();
  });
});
