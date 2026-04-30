import type { BlobAccessType } from "@vercel/blob";

export const cmsMediaBlobAccess: BlobAccessType =
  process.env.CMS_MEDIA_BLOB_ACCESS === "public" ? "public" : "private";

export const cmsMediaUploadMaxSizeInBytes = 25 * 1024 * 1024;

const mediaImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const mediaAudioExtensions = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac", ".webm"]);

const cmsMediaAcceptByKind = {
  image: ["image/*"],
  audio: ["audio/*"],
  json: ["application/json"],
} as const;

const cmsMediaInferredContentTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
};

export type CmsMediaKind = "image" | "audio" | "json" | "other";
export type CmsSupportedMediaKind = Exclude<CmsMediaKind, "other">;

export const cmsMediaDefaultKinds: CmsSupportedMediaKind[] = ["image", "audio", "json"];

export type ParsedMediaPathname = {
  directory: string;
  fileName: string;
  baseName: string;
  extension: string;
};

export function parseMediaPathname(pathname: string): ParsedMediaPathname {
  const normalizedPathname = pathname.trim();
  const lastSlashIndex = normalizedPathname.lastIndexOf("/");
  const directory = lastSlashIndex >= 0 ? normalizedPathname.slice(0, lastSlashIndex + 1) : "";
  const fileName =
    lastSlashIndex >= 0 ? normalizedPathname.slice(lastSlashIndex + 1) : normalizedPathname;
  const lastDotIndex = fileName.lastIndexOf(".");
  const hasExtension = lastDotIndex > 0;

  return {
    directory,
    fileName,
    baseName: hasExtension ? fileName.slice(0, lastDotIndex) : fileName,
    extension: hasExtension ? fileName.slice(lastDotIndex).toLowerCase() : "",
  };
}

export function sanitizeMediaBaseName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildMediaPathname({
  directory = "",
  baseName,
  extension = "",
}: {
  directory?: string;
  baseName: string;
  extension?: string;
}) {
  const sanitizedBaseName = sanitizeMediaBaseName(baseName);
  const normalizedExtension = extension
    ? extension.startsWith(".")
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`
    : "";

  return `${directory}${sanitizedBaseName}${normalizedExtension}`;
}

export function inferMediaKind(pathname: string, contentType?: string | null): CmsMediaKind {
  if (contentType === "application/json") {
    return "json";
  }

  if (typeof contentType === "string" && contentType.startsWith("image/")) {
    const { extension } = parseMediaPathname(pathname);
    return mediaImageExtensions.has(extension) ? "image" : "other";
  }

  if (typeof contentType === "string" && contentType.startsWith("audio/")) {
    const { extension } = parseMediaPathname(pathname);
    return mediaAudioExtensions.has(extension) ? "audio" : "other";
  }

  const { extension } = parseMediaPathname(pathname);

  if (extension === ".json") {
    return "json";
  }

  if (mediaImageExtensions.has(extension)) {
    return "image";
  }

  if (mediaAudioExtensions.has(extension)) {
    return "audio";
  }

  return "other";
}

export function isSupportedMediaUploadType(contentType: string | null | undefined) {
  if (!contentType) {
    return false;
  }

  return (
    contentType === "application/json" ||
    contentType.startsWith("image/") ||
    contentType.startsWith("audio/")
  );
}

export function getCmsMediaAllowedContentTypes(
  kinds: CmsSupportedMediaKind[] = cmsMediaDefaultKinds,
) {
  return [...new Set(kinds.flatMap((kind) => cmsMediaAcceptByKind[kind]))];
}

export function buildCmsMediaUploadAccept(kinds: CmsSupportedMediaKind[] = cmsMediaDefaultKinds) {
  return getCmsMediaAllowedContentTypes(kinds).join(",");
}

export function resolveCmsMediaContentTypeFromExtension(pathname: string) {
  return cmsMediaInferredContentTypeByExtension[parseMediaPathname(pathname).extension];
}

export function buildCmsMediaAssetUrl(
  pathname: string,
  options?: {
    download?: boolean;
  },
) {
  const searchParams = new URLSearchParams({ pathname });

  if (options?.download) {
    searchParams.set("download", "1");
  }

  return `/api/cms/media/blob?${searchParams.toString()}`;
}

export function extractCmsMediaPathname(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.startsWith("/api/cms/media/blob")) {
    const url = new URL(trimmedValue, "http://localhost");
    return url.searchParams.get("pathname")?.trim() ?? null;
  }

  if (!trimmedValue.startsWith("http://") && !trimmedValue.startsWith("https://")) {
    return trimmedValue.startsWith("/") ? trimmedValue.slice(1) : trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.pathname === "/api/cms/media/blob") {
      return url.searchParams.get("pathname")?.trim() ?? null;
    }

    if (url.hostname.endsWith(".blob.vercel-storage.com")) {
      return decodeURIComponent(url.pathname.slice(1));
    }

    return null;
  } catch {
    return null;
  }
}

export function resolveCmsMediaPreviewUrl(value: string) {
  const pathname = extractCmsMediaPathname(value);

  if (pathname) {
    return buildCmsMediaAssetUrl(pathname);
  }

  return value;
}
