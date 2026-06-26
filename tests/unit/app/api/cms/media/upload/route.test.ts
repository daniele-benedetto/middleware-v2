const blobClientMock = vi.hoisted(() => ({
  handleUpload: vi.fn(),
}));

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

vi.mock("@vercel/blob/client", () => blobClientMock);
vi.mock("@/lib/server/auth/session", () => authSessionMock);
vi.mock("@/lib/server/modules/media", () => mediaModuleMock);
vi.mock("@/lib/server/observability/log", () => observabilityMock);

import { handleUpload } from "@vercel/blob/client";

import { POST } from "@/app/api/cms/media/upload/route";
import { i18n } from "@/lib/i18n";
import { cmsMediaUploadMaxSizeInBytes } from "@/lib/media/blob";
import { USER_ROLES } from "@/lib/server/auth/roles";
import { getAuthSession } from "@/lib/server/auth/session";

import type { AuthSession } from "@/lib/server/auth/types";
import type { HandleUploadOptions } from "@vercel/blob/client";
import type { MockedFunction } from "vitest";

const handleUploadMock = handleUpload as MockedFunction<typeof handleUpload>;
const getAuthSessionMock = vi.mocked(getAuthSession);
type BeforeGenerateTokenResult = Awaited<ReturnType<HandleUploadOptions["onBeforeGenerateToken"]>>;

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

function createRequest() {
  return new Request("https://example.com/api/cms/media/upload", {
    method: "POST",
    body: JSON.stringify({ type: "blob.generate-client-token" }),
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
  });

  it("generates a constrained upload token for authorized CMS users", async () => {
    let generatedToken: BeforeGenerateTokenResult | undefined;

    handleUploadMock.mockImplementation(async (options) => {
      generatedToken = await options.onBeforeGenerateToken(
        "hero-image.jpg",
        JSON.stringify({ kinds: ["image"] }),
        false,
      );

      return { type: "blob.generate-client-token", clientToken: "client-token" };
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      type: "blob.generate-client-token",
      clientToken: "client-token",
    });
    expect(generatedToken).toEqual({
      addRandomSuffix: false,
      allowOverwrite: false,
      allowedContentTypes: ["image/*"],
      maximumSizeInBytes: cmsMediaUploadMaxSizeInBytes,
      tokenPayload: JSON.stringify({ userId: "user-1" }),
    });
  });

  it("rejects token generation without a CMS session", async () => {
    getAuthSessionMock.mockResolvedValue(null);
    handleUploadMock.mockImplementation(async (options) => {
      await options.onBeforeGenerateToken("hero-image.jpg", null, false);
      return { type: "blob.generate-client-token", clientToken: "client-token" };
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: i18n.cms.lists.media.uploadUnauthorized,
    });
  });

  it("rejects nested or non-normalized upload pathnames", async () => {
    handleUploadMock.mockImplementation(async (options) => {
      await options.onBeforeGenerateToken("nested/Hero Image.jpg", null, false);
      return { type: "blob.generate-client-token", clientToken: "client-token" };
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: i18n.cms.lists.media.uploadNestedPathUnsupported,
    });
  });
});
