const blobStorageMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

const authSessionMock = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
}));

const mediaModuleMock = vi.hoisted(() => ({
  mediaPolicy: {
    allowedRoles: ["ADMIN", "EDITOR"] as string[],
  },
}));

vi.mock("@vercel/blob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vercel/blob")>();

  return {
    ...actual,
    get: blobStorageMock.get,
  };
});

vi.mock("@/lib/server/auth/session", () => authSessionMock);
vi.mock("@/lib/server/modules/media", () => mediaModuleMock);

import { BlobAccessError, BlobNotFoundError, get } from "@vercel/blob";

import { GET } from "@/app/api/cms/media/blob/route";
import { cmsMediaBlobAccess } from "@/lib/media/blob";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { getAuthSession } from "@/lib/server/auth/session";
import { createErrorInstance } from "@/tests/helpers/create-error-instance";

import type { AuthSession } from "@/lib/server/auth/types";

const getBlobMock = vi.mocked(get);
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

function createRequest(pathname?: string, options?: { download?: boolean }) {
  const url = new URL("https://example.com/api/cms/media/blob");

  if (pathname) {
    url.searchParams.set("pathname", pathname);
  }

  if (options?.download) {
    url.searchParams.set("download", "1");
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
  });

  it("returns 401 without proxying the blob when the session is missing", async () => {
    getAuthSessionMock.mockResolvedValue(null);

    const response = await GET(createRequest("covers/hero-image.jpg"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(getBlobMock).not.toHaveBeenCalled();
  });

  it("returns 401 without proxying the blob when the role is not allowed", async () => {
    mediaModuleMock.mediaPolicy.allowedRoles.splice(
      0,
      mediaModuleMock.mediaPolicy.allowedRoles.length,
      USER_ROLES.ADMIN,
    );
    getAuthSessionMock.mockResolvedValue(createSession(USER_ROLES.EDITOR));

    const response = await GET(createRequest("covers/hero-image.jpg"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(getBlobMock).not.toHaveBeenCalled();
  });

  it("returns the private blob stream with download headers", async () => {
    getBlobMock.mockResolvedValue({
      statusCode: 200,
      stream: createBlobStream("image-bytes"),
      blob: {
        url: "https://store.blob.vercel-storage.com/covers/hero%20image.JPG",
        downloadUrl: "https://store.blob.vercel-storage.com/covers/hero%20image.JPG?download=1",
        contentType: "image/jpeg",
        pathname: "covers/hero image.JPG",
        contentDisposition: "inline",
        cacheControl: "private, no-store, max-age=0",
        size: 1024,
        etag: "etag-1",
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await GET(createRequest("covers/hero image.JPG", { download: true }));

    expect(getBlobMock).toHaveBeenCalledWith("covers/hero image.JPG", {
      access: cmsMediaBlobAccess,
      useCache: false,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename*=UTF-8''hero%20image.JPG",
    );
    expect(await response.text()).toBe("image-bytes");
  });

  it("maps missing blobs to 404", async () => {
    getBlobMock.mockRejectedValue(createErrorInstance(BlobNotFoundError, "missing file"));

    const response = await GET(createRequest("covers/missing.jpg"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  it("maps blob access errors to 403", async () => {
    getBlobMock.mockRejectedValue(createErrorInstance(BlobAccessError, "forbidden"));

    const response = await GET(createRequest("covers/forbidden.jpg"));

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Forbidden");
  });
});
