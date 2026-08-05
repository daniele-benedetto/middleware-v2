import { NextResponse } from "next/server";

import { i18n } from "@/lib/i18n";
import {
  buildMediaPathname,
  cmsMediaDefaultKinds,
  cmsMediaUploadMaxSizeInBytes,
  inferMediaKind,
  parseMediaPathname,
  sanitizeMediaBaseName,
} from "@/lib/media/blob";
import { getAuthSession } from "@/lib/server/auth/session";
import { ApiError } from "@/lib/server/http/api-error";
import { enforceSameOrigin } from "@/lib/server/http/origin";
import { enforceRateLimit, rateLimitPolicies } from "@/lib/server/http/rate-limit";
import { getRequestId, getRequestPath } from "@/lib/server/http/request";
import { mediaPolicy } from "@/lib/server/modules/media";
import { logServerEvent } from "@/lib/server/observability/log";
import { StorageConflictError } from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";
import { validateMediaFile } from "@/lib/server/validation/media-file";

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

function resolveAllowedKinds(rawValue: FormDataEntryValue | null): CmsSupportedMediaKind[] {
  if (typeof rawValue !== "string" || !rawValue) {
    return cmsMediaDefaultKinds;
  }

  try {
    const parsed = JSON.parse(rawValue) as { kinds?: unknown };

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

  try {
    await enforceRateLimit(request, rateLimitPolicies.mediaUpload);
    enforceSameOrigin(request);

    const session = await getAuthSession(request);

    if (!session || !mediaPolicy.allowedRoles.includes(session.user.role)) {
      throw new Error(text.uploadUnauthorized);
    }

    const contentLength = Number(request.headers.get("content-length"));

    if (
      Number.isFinite(contentLength) &&
      contentLength > cmsMediaUploadMaxSizeInBytes + 1024 * 1024
    ) {
      throw new Error(
        text.uploadSizeHint(Math.round(cmsMediaUploadMaxSizeInBytes / (1024 * 1024))),
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const pathname = formData.get("pathname");

    if (!(file instanceof File) || typeof pathname !== "string") {
      throw new Error(text.uploadFileNameRequired);
    }

    validateUploadPathname(pathname);

    if (file.size > cmsMediaUploadMaxSizeInBytes) {
      throw new Error(
        text.uploadSizeHint(Math.round(cmsMediaUploadMaxSizeInBytes / (1024 * 1024))),
      );
    }

    const allowedKinds = resolveAllowedKinds(formData.get("kinds"));
    const body = new Uint8Array(await file.arrayBuffer());
    const contentType = validateMediaFile({
      pathname,
      declaredContentType: file.type || null,
      body,
    });
    const mediaKind = inferMediaKind(pathname, contentType);

    if (!contentType || mediaKind === "other" || !allowedKinds.includes(mediaKind)) {
      throw new Error(text.uploadTypeUnsupported);
    }

    const uploaded = await mediaStorage.put({
      pathname,
      body,
      contentType,
      size: file.size,
    });

    return NextResponse.json({
      ...uploaded,
      uploadedAt: uploaded.uploadedAt.toISOString(),
    });
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
      {
        status:
          error instanceof ApiError
            ? error.status
            : error instanceof StorageConflictError
              ? 409
              : 400,
      },
    );
  }
}
