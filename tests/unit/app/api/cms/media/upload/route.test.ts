const authSessionMock = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
}));

const mediaModuleMock = vi.hoisted(() => ({
  mediaPolicy: {
    allowedRoles: ["ADMIN", "EDITOR"] as string[],
  },
}));

const observabilityMock = vi.hoisted(() => ({
  logServerEvent: vi.fn(),
}));

const mediaStorageMock = vi.hoisted(() => ({
  mediaStorage: {
    put: vi.fn(),
  },
}));

const rateLimitMock = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  rateLimitPolicies: {
    mediaUpload: { name: "media-upload", limit: 20, windowMs: 60_000 },
  },
}));

vi.mock("@/lib/server/auth/session", () => authSessionMock);
vi.mock("@/lib/server/modules/media", () => mediaModuleMock);
vi.mock("@/lib/server/observability/log", () => observabilityMock);
vi.mock("@/lib/server/storage/media-storage", () => mediaStorageMock);
vi.mock("@/lib/server/http/rate-limit", () => rateLimitMock);

import { POST } from "@/app/api/cms/media/upload/route";
import { buildPublicMediaAssetUrl, cmsMediaUploadMaxSizeInBytes } from "@/lib/media/blob";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { getAuthSession } from "@/lib/server/auth/session";
import { ApiError } from "@/lib/server/http/api-error";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { mediaStorage } from "@/lib/server/storage/media-storage";

import type { AuthSession } from "@/lib/server/auth/types";

const getAuthSessionMock = vi.mocked(getAuthSession);
const mediaStoragePutMock = vi.mocked(mediaStorage.put);
const enforceRateLimitMock = vi.mocked(enforceRateLimit);

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

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

function createRequest({
  file = new File([jpegBytes], "hero-image.jpg", { type: "image/jpeg" }),
  pathname = "hero-image.jpg",
  kinds = ["image"],
  origin = "https://example.com",
  contentLength,
}: {
  file?: File;
  pathname?: string;
  kinds?: string[];
  origin?: string | null;
  contentLength?: number;
} = {}) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("pathname", pathname);
  formData.set("kinds", JSON.stringify({ kinds }));

  return new Request("https://example.com/api/cms/media/upload", {
    method: "POST",
    body: formData,
    headers: {
      ...(origin === null ? {} : { origin }),
      ...(contentLength === undefined ? {} : { "content-length": String(contentLength) }),
    },
  });
}

describe("POST /api/cms/media/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaModuleMock.mediaPolicy.allowedRoles.splice(
      0,
      mediaModuleMock.mediaPolicy.allowedRoles.length,
      USER_ROLES.ADMIN,
      USER_ROLES.EDITOR,
    );
    getAuthSessionMock.mockResolvedValue(createSession());
    mediaStoragePutMock.mockResolvedValue({
      url: buildPublicMediaAssetUrl("hero-image.jpg"),
      downloadUrl: "/api/cms/media/blob?pathname=hero-image.jpg&download=1",
      pathname: "hero-image.jpg",
      contentType: "image/jpeg",
      size: jpegBytes.length,
      uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
      etag: "etag-1",
    });
  });

  it("uploads an authorized CMS file to media storage", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    expect(mediaStoragePutMock).toHaveBeenCalledWith({
      pathname: "hero-image.jpg",
      body: expect.any(Uint8Array),
      contentType: "image/jpeg",
      size: jpegBytes.length,
    });
    await expect(response.json()).resolves.toMatchObject({
      url: "/api/public/media/blob?pathname=hero-image.jpg",
      pathname: "hero-image.jpg",
      contentType: "image/jpeg",
      etag: "etag-1",
    });
  });

  it("rejects upload without a CMS session", async () => {
    getAuthSessionMock.mockResolvedValue(null);

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });

  it("rejects missing and cross-origin upload writes before authentication", async () => {
    const missingOriginResponse = await POST(createRequest({ origin: null }));
    const crossOriginResponse = await POST(createRequest({ origin: "https://attacker.example" }));

    expect(missingOriginResponse.status).toBe(403);
    expect(crossOriginResponse.status).toBe(403);
    expect(getAuthSessionMock).not.toHaveBeenCalled();
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });

  it("returns the rate-limit status without parsing or storing the upload", async () => {
    enforceRateLimitMock.mockRejectedValueOnce(
      new ApiError(429, "RATE_LIMITED", "Rate limit exceeded for this endpoint"),
    );

    const response = await POST(createRequest());

    expect(enforceRateLimitMock).toHaveBeenCalledWith(
      expect.any(Request),
      rateLimitPolicies.mediaUpload,
    );
    expect(response.status).toBe(429);
    expect(getAuthSessionMock).not.toHaveBeenCalled();
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });

  it("rejects spoofed MIME types and invalid file signatures", async () => {
    const mismatchedMime = new File([jpegBytes], "hero.png", { type: "image/jpeg" });
    const fakeJpeg = new File(["not-an-image"], "hero.jpg", { type: "image/jpeg" });

    const mismatchedResponse = await POST(
      createRequest({ file: mismatchedMime, pathname: "hero.png" }),
    );
    const fakeResponse = await POST(createRequest({ file: fakeJpeg, pathname: "hero.jpg" }));

    expect(mismatchedResponse.status).toBe(400);
    expect(fakeResponse.status).toBe(400);
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });

  it("rejects nested or non-normalized pathnames", async () => {
    const response = await POST(createRequest({ pathname: "nested/Hero Image.jpg" }));

    expect(response.status).toBe(400);
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });

  it("rejects files above the upload size limit", async () => {
    const file = new File([new Uint8Array(cmsMediaUploadMaxSizeInBytes + 1)], "huge.jpg", {
      type: "image/jpeg",
    });

    const response = await POST(createRequest({ file, pathname: "huge.jpg" }));

    expect(response.status).toBe(400);
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized declared request before parsing multipart data", async () => {
    const request = createRequest({
      contentLength: cmsMediaUploadMaxSizeInBytes + 1024 * 1024 + 1,
    });
    const formDataSpy = vi.spyOn(request, "formData");

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(mediaStoragePutMock).not.toHaveBeenCalled();
  });
});
