import "server-only";

import { Readable } from "node:stream";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import { buildCmsMediaAssetUrl, buildPublicMediaAssetUrl } from "@/lib/media/blob";
import {
  StorageAccessError,
  StorageConflictError,
  StorageNotFoundError,
} from "@/lib/server/storage/errors";
import { getS3Client } from "@/lib/server/storage/s3-client";
import { getS3Config } from "@/lib/server/storage/s3-config";

export type MediaStorageRecord = {
  url: string;
  downloadUrl: string;
  pathname: string;
  contentType: string | null;
  size: number;
  uploadedAt: Date;
  etag: string;
};

export type MediaStorageObject = MediaStorageRecord & {
  stream: ReadableStream<Uint8Array>;
};

type PutMediaObjectInput = {
  pathname: string;
  body: Uint8Array;
  contentType: string;
  size: number;
};

type DeleteMediaObjectInput = {
  pathname: string;
  etag?: string;
};

type GetMediaObjectInput = {
  range?: string;
};

function normalizeEtag(value: string | undefined) {
  return value?.replace(/^"|"$/g, "") ?? "";
}

function toStorageRecord({
  pathname,
  contentType,
  size,
  uploadedAt,
  etag,
}: {
  pathname: string;
  contentType?: string | null;
  size?: number | null;
  uploadedAt?: Date | null;
  etag?: string;
}): MediaStorageRecord {
  return {
    url: buildPublicMediaAssetUrl(pathname),
    downloadUrl: buildCmsMediaAssetUrl(pathname, { download: true }),
    pathname,
    contentType: contentType ?? null,
    size: size ?? 0,
    uploadedAt: uploadedAt ?? new Date(0),
    etag: normalizeEtag(etag),
  };
}

function isNotFoundError(error: unknown) {
  return (
    error instanceof NoSuchKey ||
    error instanceof NotFound ||
    (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
  );
}

function isAccessError(error: unknown) {
  return error instanceof S3ServiceException && error.$metadata.httpStatusCode === 403;
}

function isConflictError(error: unknown) {
  return (
    error instanceof S3ServiceException &&
    (error.$metadata.httpStatusCode === 409 || error.$metadata.httpStatusCode === 412)
  );
}

function mapStorageError(error: unknown): never {
  if (isNotFoundError(error)) {
    throw new StorageNotFoundError(undefined, { cause: error });
  }

  if (isConflictError(error)) {
    throw new StorageConflictError(undefined, { cause: error });
  }

  if (isAccessError(error)) {
    throw new StorageAccessError(undefined, { cause: error });
  }

  throw error;
}

function toWebStream(body: unknown): ReadableStream<Uint8Array> {
  if (body instanceof ReadableStream) {
    return body as ReadableStream<Uint8Array>;
  }

  if (body && typeof (body as Readable).pipe === "function") {
    return Readable.toWeb(body as Readable) as ReadableStream<Uint8Array>;
  }

  throw new StorageNotFoundError();
}

function encodeCopySource(bucket: string, pathname: string) {
  return `${bucket}/${pathname.split("/").map(encodeURIComponent).join("/")}`;
}

export const mediaStorage = {
  async listAll(): Promise<MediaStorageRecord[]> {
    const client = getS3Client();
    const { bucket } = getS3Config();
    const items: MediaStorageRecord[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const result = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
          }),
        );

        for (const object of result.Contents ?? []) {
          if (!object.Key) {
            continue;
          }

          items.push(
            toStorageRecord({
              pathname: object.Key,
              size: object.Size,
              uploadedAt: object.LastModified,
              etag: object.ETag,
            }),
          );
        }

        continuationToken = result.NextContinuationToken;
      } while (continuationToken);

      return items;
    } catch (error) {
      mapStorageError(error);
    }
  },

  async head(pathname: string): Promise<MediaStorageRecord> {
    const client = getS3Client();
    const { bucket } = getS3Config();

    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: pathname }));
      return toStorageRecord({
        pathname,
        contentType: result.ContentType,
        size: result.ContentLength,
        uploadedAt: result.LastModified,
        etag: result.ETag,
      });
    } catch (error) {
      mapStorageError(error);
    }
  },

  async put(input: PutMediaObjectInput): Promise<MediaStorageRecord> {
    const client = getS3Client();
    const { bucket } = getS3Config();

    try {
      await this.head(input.pathname).then(
        () => {
          throw new StorageConflictError("File already exists");
        },
        (error) => {
          if (error instanceof StorageNotFoundError) {
            return undefined;
          }

          throw error;
        },
      );

      const result = await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.pathname,
          Body: input.body,
          ContentLength: input.size,
          ContentType: input.contentType,
        }),
      );

      return toStorageRecord({
        pathname: input.pathname,
        contentType: input.contentType,
        size: input.size,
        uploadedAt: new Date(),
        etag: result.ETag,
      });
    } catch (error) {
      mapStorageError(error);
    }
  },

  async copy(sourcePathname: string, targetPathname: string): Promise<MediaStorageRecord> {
    const client = getS3Client();
    const { bucket } = getS3Config();
    const source = await this.head(sourcePathname);

    try {
      await this.head(targetPathname).then(
        () => {
          throw new StorageConflictError("File already exists");
        },
        (error) => {
          if (error instanceof StorageNotFoundError) {
            return undefined;
          }

          throw error;
        },
      );

      const result = await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: targetPathname,
          CopySource: encodeCopySource(bucket, sourcePathname),
          ContentType: source.contentType ?? undefined,
          MetadataDirective: "COPY",
        }),
      );

      return toStorageRecord({
        pathname: targetPathname,
        contentType: source.contentType,
        size: source.size,
        uploadedAt: result.CopyObjectResult?.LastModified ?? new Date(),
        etag: result.CopyObjectResult?.ETag,
      });
    } catch (error) {
      mapStorageError(error);
    }
  },

  async delete(input: DeleteMediaObjectInput): Promise<void> {
    const client = getS3Client();
    const { bucket } = getS3Config();

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: input.pathname,
          IfMatch: input.etag,
        }),
      );
    } catch (error) {
      mapStorageError(error);
    }
  },

  async get(pathname: string, input: GetMediaObjectInput = {}): Promise<MediaStorageObject> {
    const client = getS3Client();
    const { bucket } = getS3Config();

    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: pathname, Range: input.range }),
      );

      return {
        ...toStorageRecord({
          pathname,
          contentType: result.ContentType,
          size: result.ContentLength,
          uploadedAt: result.LastModified,
          etag: result.ETag,
        }),
        stream: toWebStream(result.Body),
      };
    } catch (error) {
      mapStorageError(error);
    }
  },
};
