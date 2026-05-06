const articlesRepositoryMock = vi.hoisted(() => ({
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

vi.mock("@/lib/server/modules/articles/repository", () => ({
  articlesRepository: articlesRepositoryMock,
}));

vi.mock("@/lib/server/modules/media/repository", () => ({
  mediaRepository: mediaRepositoryMock,
}));

import {
  BlobNotFoundError,
  BlobPreconditionFailedError,
  BlobServiceRateLimited,
} from "@vercel/blob";

import { mediaService } from "@/lib/server/modules/media/service";
import { createErrorInstance } from "@/tests/helpers/create-error-instance";

function createBlobRecord(overrides: Record<string, unknown> = {}) {
  return {
    url: "https://store.blob.vercel-storage.com/covers/hero-image.jpg",
    downloadUrl: "https://store.blob.vercel-storage.com/covers/hero-image.jpg?download=1",
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
      url: "https://store.blob.vercel-storage.com/covers/older.jpg",
      downloadUrl: "https://store.blob.vercel-storage.com/covers/older.jpg?download=1",
      pathname: "covers/older.jpg",
      uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newerBlob = createBlobRecord({
      url: "https://store.blob.vercel-storage.com/covers/newer.jpg",
      downloadUrl: "https://store.blob.vercel-storage.com/covers/newer.jpg?download=1",
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
        url: "https://store.blob.vercel-storage.com/covers/hero-image.jpg",
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
      url: "https://store.blob.vercel-storage.com/covers/hero-image-2.jpg",
      downloadUrl: "https://store.blob.vercel-storage.com/covers/hero-image-2.jpg?download=1",
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

  it("maps blob storage rate limit errors on list", async () => {
    mediaRepositoryMock.listAll.mockRejectedValue(
      createErrorInstance(BlobServiceRateLimited, "rate limited"),
    );

    await expect(mediaService.list()).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      message: "Vercel Blob rate limit exceeded",
    });
  });

  it("maps not found errors on delete", async () => {
    mediaRepositoryMock.head.mockRejectedValue(
      createErrorInstance(BlobNotFoundError, "missing file"),
    );

    await expect(
      mediaService.delete({ url: "https://store.blob.vercel-storage.com/covers/missing.jpg" }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "File not found",
    });
  });

  it("maps precondition failures on delete to conflict", async () => {
    const current = createBlobRecord();
    mediaRepositoryMock.head.mockResolvedValue(current);
    mediaRepositoryMock.delete.mockRejectedValue(
      createErrorInstance(BlobPreconditionFailedError, "stale etag"),
    );

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
