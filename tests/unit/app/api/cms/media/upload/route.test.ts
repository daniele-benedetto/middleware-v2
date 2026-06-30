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

vi.mock("@/lib/server/auth/session", () => authSessionMock);
vi.mock("@/lib/server/modules/media", () => mediaModuleMock);
vi.mock("@/lib/server/observability/log", () => observabilityMock);
vi.mock("@/lib/server/storage/media-storage", () => mediaStorageMock);

import { POST } from "@/app/api/cms/media/upload/route";
import { buildPublicMediaAssetUrl, cmsMediaUploadMaxSizeInBytes } from "@/lib/media/blob";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { getAuthSession } from "@/lib/server/auth/session";
import { mediaStorage } from "@/lib/server/storage/media-storage";

import type { AuthSession } from "@/lib/server/auth/types";

const getAuthSessionMock = vi.mocked(getAuthSession);
const mediaStoragePutMock = vi.mocked(mediaStorage.put);

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
  file = new File(["image-bytes"], "hero-image.jpg", { type: "image/jpeg" }),
  pathname = "hero-image.jpg",
  kinds = ["image"],
}: {
  file?: File;
  pathname?: string;
  kinds?: string[];
} = {}) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("pathname", pathname);
  formData.set("kinds", JSON.stringify({ kinds }));

  return new Request("https://example.com/api/cms/media/upload", {
    method: "POST",
    body: formData,
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
      size: 11,
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
      size: 11,
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
});
