const blobStorageMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

const publicMediaServiceMock = vi.hoisted(() => ({
  publicMediaService: {
    canServePublishedMedia: vi.fn(),
    canServePublishedImage: vi.fn(),
  },
}));

vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();

  return {
    ...actual,
    get: blobStorageMock.get,
  };
});

vi.mock("@/lib/server/modules/media/service/public", () => publicMediaServiceMock);

import { BlobAccessError, get } from "@vercel/blob";

import { GET } from "@/app/api/public/media/blob/route";
import { cmsMediaBlobAccess } from "@/lib/media/blob";
import { publicMediaService } from "@/lib/server/modules/media/service/public";
import { createErrorInstance } from "@/tests/helpers/create-error-instance";

const getBlobMock = vi.mocked(get);
const canServePublishedMediaMock = vi.mocked(publicMediaService.canServePublishedMedia);

function createRequest(pathname?: string) {
  const url = new URL("https://example.com/api/public/media/blob");

  if (pathname) {
    url.searchParams.set("pathname", pathname);
  }

  return new Request(url);
}

function createBlobStream(body: string) {
  const stream = new Response(body).body;

  if (!stream) {
    throw new Error("Unable to create blob stream for test");
  }

  return stream;
}

describe("GET /api/public/media/blob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canServePublishedMediaMock.mockResolvedValue(true);
  });

  it("returns 400 when pathname is missing", async () => {
    const response = await GET(createRequest());

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing pathname");
    expect(getBlobMock).not.toHaveBeenCalled();
  });

  it("returns 404 without proxying when the pathname is not publicly authorized", async () => {
    canServePublishedMediaMock.mockResolvedValue(false);

    const response = await GET(createRequest("covers/private.jpg"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
    expect(getBlobMock).not.toHaveBeenCalled();
  });

  it("returns the authorized private blob stream with public cache headers", async () => {
    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream: createBlobStream("image-bytes"),
      headers: new Headers({
        "content-type": "image/jpeg",
      }),
      blob: {
        url: "https://store.blob.vercel-storage.com/covers/hero%20image.JPG",
        downloadUrl: "https://store.blob.vercel-storage.com/covers/hero%20image.JPG?download=1",
        contentType: "image/jpeg",
        pathname: "covers/hero image.JPG",
        contentDisposition: "inline",
        cacheControl: "public, max-age=3600",
        size: 1024,
        etag: "etag-1",
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await GET(createRequest("covers/hero image.JPG"));

    expect(canServePublishedMediaMock).toHaveBeenCalledWith("covers/hero image.JPG");
    expect(getBlobMock).toHaveBeenCalledWith("covers/hero image.JPG", {
      access: cmsMediaBlobAccess,
      useCache: true,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(response.headers.get("content-disposition")).toBe(
      "inline; filename*=UTF-8''hero%20image.JPG",
    );
    expect(await response.text()).toBe("image-bytes");
  });

  it("maps blob access errors to 404", async () => {
    getBlobMock.mockRejectedValue(createErrorInstance(BlobAccessError, "forbidden"));

    const response = await GET(createRequest("covers/forbidden.jpg"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("returns the authorized private audio stream with public cache headers", async () => {
    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream: createBlobStream("audio-bytes"),
      headers: new Headers({
        "content-type": "audio/mpeg",
      }),
      blob: {
        url: "https://store.blob.vercel-storage.com/audio/story.mp3",
        downloadUrl: "https://store.blob.vercel-storage.com/audio/story.mp3?download=1",
        contentType: "audio/mpeg",
        pathname: "audio/story.mp3",
        contentDisposition: "inline",
        cacheControl: "public, max-age=3600",
        size: 1024,
        etag: "etag-1",
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await GET(createRequest("audio/story.mp3"));

    expect(canServePublishedMediaMock).toHaveBeenCalledWith("audio/story.mp3");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(await response.text()).toBe("audio-bytes");
  });

  it("does not serve authorized non-media blobs", async () => {
    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream: createBlobStream("json-bytes"),
      headers: new Headers({
        "content-type": "application/json",
      }),
      blob: {
        url: "https://store.blob.vercel-storage.com/data/file.json",
        downloadUrl: "https://store.blob.vercel-storage.com/data/file.json?download=1",
        contentType: "application/json",
        pathname: "data/file.json",
        contentDisposition: "inline",
        cacheControl: "public, max-age=3600",
        size: 1024,
        etag: "etag-1",
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await GET(createRequest("data/file.json"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
