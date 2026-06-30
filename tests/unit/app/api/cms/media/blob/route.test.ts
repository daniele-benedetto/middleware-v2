const mediaStorageMock = vi.hoisted(() => ({
  mediaStorage: {
    head: vi.fn(),
    get: vi.fn(),
  },
}));

const authSessionMock = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
}));

const mediaModuleMock = vi.hoisted(() => ({
  mediaPolicy: {
    allowedRoles: ["ADMIN", "EDITOR"] as string[],
  },
}));

vi.mock("@/lib/server/storage/media-storage", () => mediaStorageMock);
vi.mock("@/lib/server/auth/session", () => authSessionMock);
vi.mock("@/lib/server/modules/media", () => mediaModuleMock);

import { GET } from "@/app/api/cms/media/blob/route";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { getAuthSession } from "@/lib/server/auth/session";
import { StorageAccessError, StorageNotFoundError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

import type { AuthSession } from "@/lib/server/auth/types";

const getMediaMock = vi.mocked(mediaStorage.get);
const headMediaMock = vi.mocked(mediaStorage.head);
const getAuthSessionMock = vi.mocked(getAuthSession);

function createSession(role: AuthSession["user"]["role"] = USER_ROLES.ADMIN): AuthSession {
  return {
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      role,
    },
  };
}

function createRequest(pathname?: string, options?: { download?: boolean; headers?: HeadersInit }) {
  const url = new URL("https://example.com/api/cms/media/blob");

  if (pathname) {
    url.searchParams.set("pathname", pathname);
  }

  if (options?.download) {
    url.searchParams.set("download", "1");
  }

  return new Request(url, { headers: options?.headers });
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
    url: "/api/public/media/blob?pathname=covers%2Fhero+image.JPG",
    downloadUrl: "/api/cms/media/blob?pathname=covers%2Fhero+image.JPG&download=1",
    contentType: "image/jpeg",
    pathname: "covers/hero image.JPG",
    size: 1024,
    etag: "etag-1",
    uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
    stream: createMediaStream("image-bytes"),
    ...overrides,
  };
}

describe("GET /api/cms/media/blob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaModuleMock.mediaPolicy.allowedRoles.splice(
      0,
      mediaModuleMock.mediaPolicy.allowedRoles.length,
      USER_ROLES.ADMIN,
      USER_ROLES.EDITOR,
    );
    getAuthSessionMock.mockResolvedValue(createSession());
    headMediaMock.mockResolvedValue(createMediaRecord());
  });

  it("returns 401 without reading media when the session is missing", async () => {
    getAuthSessionMock.mockResolvedValue(null);

    const response = await GET(createRequest("covers/hero-image.jpg"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(headMediaMock).not.toHaveBeenCalled();
    expect(getMediaMock).not.toHaveBeenCalled();
  });

  it("returns 401 without reading media when the role is not allowed", async () => {
    mediaModuleMock.mediaPolicy.allowedRoles.splice(
      0,
      mediaModuleMock.mediaPolicy.allowedRoles.length,
      USER_ROLES.ADMIN,
    );
    getAuthSessionMock.mockResolvedValue(createSession(USER_ROLES.EDITOR));

    const response = await GET(createRequest("covers/hero-image.jpg"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(headMediaMock).not.toHaveBeenCalled();
    expect(getMediaMock).not.toHaveBeenCalled();
  });

  it("returns the private media stream with download headers", async () => {
    getMediaMock.mockResolvedValue(createMediaRecord());

    const response = await GET(createRequest("covers/hero image.JPG", { download: true }));

    expect(headMediaMock).toHaveBeenCalledWith("covers/hero image.JPG");
    expect(getMediaMock).toHaveBeenCalledWith("covers/hero image.JPG", undefined);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-length")).toBe("1024");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename*=UTF-8''hero%20image.JPG",
    );
    expect(await response.text()).toBe("image-bytes");
  });

  it("maps missing media to 404", async () => {
    headMediaMock.mockRejectedValue(new StorageNotFoundError());

    const response = await GET(createRequest("covers/missing.jpg"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("maps storage access errors to 403", async () => {
    headMediaMock.mockRejectedValue(new StorageAccessError());

    const response = await GET(createRequest("covers/forbidden.jpg"));

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
  });

  it("returns a partial media response for a valid byte range", async () => {
    getMediaMock.mockResolvedValue(
      createMediaRecord({
        stream: createMediaStream("partial"),
      }),
    );

    const response = await GET(
      createRequest("covers/hero image.JPG", { headers: { range: "bytes=2-8" } }),
    );

    expect(getMediaMock).toHaveBeenCalledWith("covers/hero image.JPG", { range: "bytes=2-8" });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-8/1024");
    expect(response.headers.get("content-length")).toBe("7");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(await response.text()).toBe("partial");
  });

  it("returns 416 for an unsatisfiable byte range", async () => {
    const response = await GET(
      createRequest("covers/hero image.JPG", { headers: { range: "bytes=1024-2048" } }),
    );

    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */1024");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(getMediaMock).not.toHaveBeenCalled();
  });
});
