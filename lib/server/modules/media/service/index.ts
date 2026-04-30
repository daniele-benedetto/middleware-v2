import "server-only";

import {
  BlobAccessError,
  BlobError,
  BlobNotFoundError,
  BlobPreconditionFailedError,
  BlobServiceRateLimited,
} from "@vercel/blob";

import {
  buildMediaPathname,
  inferMediaKind,
  parseMediaPathname,
  sanitizeMediaBaseName,
} from "@/lib/media/blob";
import { ApiError } from "@/lib/server/http/api-error";
import { articlesRepository } from "@/lib/server/modules/articles/repository";
import { mediaRepository } from "@/lib/server/modules/media/repository";

import type { MediaItemDto } from "@/lib/server/modules/media/dto";
import type { DeleteMediaInput, RenameMediaInput } from "@/lib/server/modules/media/schema";

type MediaListRecord = Awaited<ReturnType<typeof mediaRepository.listAll>>[number];
type MediaHeadRecord = Awaited<ReturnType<typeof mediaRepository.head>>;
type MediaBlobRecord = MediaListRecord | MediaHeadRecord;

type ArticleMediaReferenceRecord = {
  id: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  audioChunks: unknown;
};

function mapMediaError(error: unknown, notFoundMessage: string) {
  if (error instanceof BlobNotFoundError) {
    return new ApiError(404, "NOT_FOUND", notFoundMessage);
  }

  if (error instanceof BlobPreconditionFailedError) {
    return new ApiError(409, "CONFLICT", "The selected file changed during the operation");
  }

  if (error instanceof BlobServiceRateLimited) {
    return new ApiError(429, "RATE_LIMITED", "Vercel Blob rate limit exceeded");
  }

  if (error instanceof BlobAccessError) {
    return new ApiError(500, "INTERNAL_ERROR", "Unable to access Vercel Blob");
  }

  if (error instanceof BlobError) {
    if (/already exists/i.test(error.message)) {
      return new ApiError(409, "CONFLICT", error.message);
    }

    return new ApiError(500, "INTERNAL_ERROR", error.message || "Vercel Blob request failed");
  }

  return error;
}

function createMediaReferenceMap(records: ArticleMediaReferenceRecord[]) {
  const map = new Map<string, MediaItemDto["articleReferences"]>();

  for (const record of records) {
    if (record.imageUrl) {
      map.set(record.imageUrl, [
        ...(map.get(record.imageUrl) ?? []),
        {
          id: record.id,
          title: record.title,
          field: "imageUrl" as const,
        },
      ]);
    }

    if (record.audioUrl) {
      map.set(record.audioUrl, [
        ...(map.get(record.audioUrl) ?? []),
        {
          id: record.id,
          title: record.title,
          field: "audioUrl" as const,
        },
      ]);
    }

    if (typeof record.audioChunks === "string") {
      map.set(record.audioChunks, [
        ...(map.get(record.audioChunks) ?? []),
        {
          id: record.id,
          title: record.title,
          field: "audioChunks" as const,
        },
      ]);
    }
  }

  return map;
}

function toMediaItemDto(
  blob: MediaBlobRecord,
  articleReferences: MediaItemDto["articleReferences"] = [],
): MediaItemDto {
  const { directory, fileName, baseName, extension } = parseMediaPathname(blob.pathname);

  return {
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    pathname: blob.pathname,
    directory,
    fileName,
    baseName,
    extension,
    kind: inferMediaKind(
      blob.pathname,
      "contentType" in blob && typeof blob.contentType === "string" ? blob.contentType : null,
    ),
    size: blob.size,
    uploadedAt: blob.uploadedAt.toISOString(),
    etag: blob.etag,
    articleReferences,
  };
}

async function loadMediaReferences(urls: string[]) {
  if (urls.length === 0) {
    return new Map<string, MediaItemDto["articleReferences"]>();
  }

  const references = await articlesRepository.listMediaReferences(urls);
  return createMediaReferenceMap(references as ArticleMediaReferenceRecord[]);
}

export const mediaService = {
  async list() {
    try {
      const blobs = await mediaRepository.listAll();
      const referenceMap = await loadMediaReferences(blobs.map((blob) => blob.url));

      return {
        items: blobs
          .map((blob) => toMediaItemDto(blob, referenceMap.get(blob.url) ?? []))
          .sort((left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt)),
      };
    } catch (error) {
      throw mapMediaError(error, "File not found");
    }
  },
  async rename(input: RenameMediaInput) {
    const nextBaseName = sanitizeMediaBaseName(input.name);

    if (!nextBaseName) {
      throw new ApiError(400, "VALIDATION_ERROR", "File name is required");
    }

    try {
      const current = await mediaRepository.head(input.url);
      const { directory, extension } = parseMediaPathname(current.pathname);
      const nextPathname = buildMediaPathname({
        directory,
        baseName: nextBaseName,
        extension,
      });

      if (nextPathname === current.pathname) {
        const referenceMap = await loadMediaReferences([current.url]);

        return {
          item: toMediaItemDto(current, referenceMap.get(current.url) ?? []),
          articleIds: [],
        };
      }

      const renamed = await mediaRepository.rename(current.url, nextPathname, current);
      let articleIds: string[] = [];

      try {
        articleIds = await articlesRepository.replaceMediaUrl(current.url, renamed.url);
      } catch (error) {
        await mediaRepository.delete(renamed.url, renamed).catch(() => undefined);
        throw error;
      }

      try {
        await mediaRepository.delete(current.url, current);
      } catch (error) {
        if (!(error instanceof BlobNotFoundError)) {
          throw new ApiError(500, "INTERNAL_ERROR", "File renamed but original cleanup failed");
        }
      }

      const referenceMap = await loadMediaReferences([renamed.url]);

      return {
        item: toMediaItemDto(renamed, referenceMap.get(renamed.url) ?? []),
        articleIds,
      };
    } catch (error) {
      throw mapMediaError(error, "File not found");
    }
  },
  async delete(input: DeleteMediaInput) {
    try {
      const current = await mediaRepository.head(input.url);
      await mediaRepository.delete(current.url, current);
      const articleIds = await articlesRepository.clearMediaUrl(current.url);

      return {
        success: true as const,
        articleIds,
      };
    } catch (error) {
      throw mapMediaError(error, "File not found");
    }
  },
};
