import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import {
  buildMediaPathname,
  cmsMediaDefaultKinds,
  cmsMediaUploadMaxSizeInBytes,
  getCmsMediaAllowedContentTypes,
  inferMediaKind,
  parseMediaPathname,
  sanitizeMediaBaseName,
} from "@/lib/media/blob";
import { getAuthSession } from "@/lib/server/auth/session";
import { mediaPolicy } from "@/lib/server/modules/media";

import type { CmsSupportedMediaKind } from "@/lib/media/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateUploadPathname(pathname: string) {
  const { directory, baseName, extension } = parseMediaPathname(pathname);

  if (directory) {
    throw new Error("Nested upload paths are not supported from this form");
  }

  if (!extension) {
    throw new Error("A file extension is required");
  }

  const sanitizedBaseName = sanitizeMediaBaseName(baseName);

  if (!sanitizedBaseName) {
    throw new Error("A valid file name is required");
  }

  const normalizedPathname = buildMediaPathname({
    baseName: sanitizedBaseName,
    extension,
  });

  if (normalizedPathname !== pathname) {
    throw new Error("Invalid file name");
  }

  if (inferMediaKind(normalizedPathname) === "other") {
    throw new Error("Unsupported file extension");
  }
}

function resolveAllowedKinds(clientPayload: string | null): CmsSupportedMediaKind[] {
  if (!clientPayload) {
    return cmsMediaDefaultKinds;
  }

  try {
    const parsed = JSON.parse(clientPayload) as { kinds?: unknown };

    if (!Array.isArray(parsed.kinds)) {
      return cmsMediaDefaultKinds;
    }

    const kinds = parsed.kinds.filter(
      (kind): kind is CmsSupportedMediaKind =>
        kind === "image" || kind === "audio" || kind === "json",
    );

    return kinds.length > 0 ? kinds : cmsMediaDefaultKinds;
  } catch {
    return cmsMediaDefaultKinds;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getAuthSession(request);

        if (!session || !mediaPolicy.allowedRoles.includes(session.user.role)) {
          throw new Error("Not authorized");
        }

        validateUploadPathname(pathname);

        const allowedKinds = resolveAllowedKinds(clientPayload);
        const mediaKind = inferMediaKind(pathname);

        if (mediaKind === "other" || !allowedKinds.includes(mediaKind)) {
          throw new Error("Unsupported file type for this upload");
        }

        return {
          allowedContentTypes: getCmsMediaAllowedContentTypes(allowedKinds),
          maximumSizeInBytes: cmsMediaUploadMaxSizeInBytes,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
