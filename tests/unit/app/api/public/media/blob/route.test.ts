const mediaStorageMock = vi.hoisted(() => ({
  mediaStorage: {
    get: vi.fn(),
  },
}));

const publicMediaServiceMock = vi.hoisted(() => ({
  publicMediaService: {
    canServePublishedMedia: vi.fn(),
    canServePublishedImage: vi.fn(),
  },
}));

vi.mock("@/lib/server/storage/media-storage", () => mediaStorageMock);
vi.mock("@/lib/server/modules/media/service/public", () => publicMediaServiceMock);

import { GET } from "@/app/api/public/media/blob/route";
import { publicMediaService } from "@/lib/server/modules/media/service/public";
import { StorageAccessError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

const getMediaMock = vi.mocked(mediaStorage.get);
const canServePublishedMediaMock = vi.mocked(publicMediaService.canServePublishedMedia);

function createRequest(pathname?: string) {
  const url = new URL("https://example.com/api/public/media/blob");

  if (pathname) {
    url.searchParams.set("pathname", pathname);
  }

  return new Request(url);
}

function createMediaStream(body: string) {
  const stream = new Response(body).body;

  if (!stream) {
    throw new Error("Unable to create media stream for test");
  }

  return stream;
}

function createMediaRecord(overrides: Record<string, unknown> = {}) {
  return {
    url: "/api/public/media/blob?pathname=covers%2Fhero-image.jpg",
    downloadUrl: "/api/cms/media/blob?pathname=covers%2Fhero-image.jpg&download=1",
    contentType: "image/jpeg",
    pathname: "covers/hero image.JPG",
    size: 1024,
    etag: "etag-1",
    uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    stream: createMediaStream("image-bytes"),
    ...overrides,
  };
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
    expect(getMediaMock).not.toHaveBeenCalled();
  });

  it("returns 404 without reading storage when the pathname is not publicly authorized", async () => {
    canServePublishedMediaMock.mockResolvedValue(false);

    const response = await GET(createRequest("covers/private.jpg"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
    expect(getMediaMock).not.toHaveBeenCalled();
  });

  it("returns the authorized private media stream with public cache headers", async () => {
    getMediaMock.mockResolvedValue(createMediaRecord());

    const response = await GET(createRequest("covers/hero image.JPG"));

    expect(canServePublishedMediaMock).toHaveBeenCalledWith("covers/hero image.JPG");
    expect(getMediaMock).toHaveBeenCalledWith("covers/hero image.JPG");
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

  it("maps storage access errors to 404", async () => {
    getMediaMock.mockRejectedValue(new StorageAccessError());

    const response = await GET(createRequest("covers/forbidden.jpg"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("returns the authorized private audio stream with public cache headers", async () => {
    getMediaMock.mockResolvedValue(
      createMediaRecord({
        contentType: "audio/mpeg",
        pathname: "audio/story.mp3",
        stream: createMediaStream("audio-bytes"),
      }),
    );

    const response = await GET(createRequest("audio/story.mp3"));

    expect(canServePublishedMediaMock).toHaveBeenCalledWith("audio/story.mp3");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(await response.text()).toBe("audio-bytes");
  });

  it("does not serve authorized non-media objects", async () => {
    getMediaMock.mockResolvedValue(
      createMediaRecord({
        contentType: "application/json",
        pathname: "data/file.json",
        stream: createMediaStream("json-bytes"),
      }),
    );

    const response = await GET(createRequest("data/file.json"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
