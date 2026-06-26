import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { i18n } from "@/lib/i18n";
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
import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { mediaPolicy } from "@/lib/server/modules/media";
import { logServerEvent } from "@/lib/server/observability/log";

import type { CmsSupportedMediaKind } from "@/lib/media/blob";

function validateUploadPathname(pathname: string) {
  const text = i18n.cms.lists.media;
  const { directory, baseName, extension } = parseMediaPathname(pathname);

  if (directory) {
    throw new Error(text.uploadNestedPathUnsupported);
  }

  if (!extension) {
    throw new Error(text.uploadExtensionRequired);
  }

  const sanitizedBaseName = sanitizeMediaBaseName(baseName);

  if (!sanitizedBaseName) {
    throw new Error(text.uploadFileNameRequired);
  }

  const normalizedPathname = buildMediaPathname({
    baseName: sanitizedBaseName,
    extension,
  });

  if (normalizedPathname !== pathname) {
    throw new Error(text.uploadFileNameInvalid);
  }

  if (inferMediaKind(normalizedPathname) === "other") {
    throw new Error(text.uploadExtensionUnsupported);
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
  const text = i18n.cms.lists.media;
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getAuthSession(request);

        if (!session || !mediaPolicy.allowedRoles.includes(session.user.role)) {
          throw new Error(text.uploadUnauthorized);
        }

        validateUploadPathname(pathname);

        const allowedKinds = resolveAllowedKinds(clientPayload);
        const mediaKind = inferMediaKind(pathname);

        if (mediaKind === "other" || !allowedKinds.includes(mediaKind)) {
          throw new Error(text.uploadTypeUnsupported);
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
    logServerEvent({
      event: "BLOB_UPLOAD_FAILED",
      level: "warn",
      requestId: getRequestId(request),
      path: getRequestPath(request),
      method: request.method,
      error,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : text.uploadFailed },
      { status: 400 },
    );
  }
}
