const s3ClientMock = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@/lib/server/storage/s3-client", () => ({
  getS3Client: vi.fn(() => s3ClientMock),
}));

vi.mock("@/lib/server/storage/s3-config", () => ({
  getS3Config: vi.fn(() => ({
    endpoint: "http://localhost:9000",
    region: "eu-central-1",
    bucket: "middleware-media",
    accessKey: "access-key",
    secretKey: "secret-key",
    forcePathStyle: true,
  })),
}));

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

import {
  StorageAccessError,
  StorageConflictError,
  StorageNotFoundError,
} from "@/lib/server/storage/errors";
import { mediaStorage } from "@/lib/server/storage/media-storage";

function createS3Error(statusCode: number) {
  return new S3ServiceException({
    name: `S3${statusCode}`,
    $fault: "client",
    $metadata: { httpStatusCode: statusCode },
  });
}

function commandInput<T extends { input: unknown }>(command: T) {
  return command.input;
}

describe("mediaStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAll", () => {
    it("lists all objects across S3 pages", async () => {
      s3ClientMock.send
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: "covers/hero.jpg",
              Size: 1024,
              LastModified: new Date("2026-01-01T00:00:00.000Z"),
              ETag: '"etag-1"',
            },
            { Size: 99, ETag: '"ignored"' },
          ],
          NextContinuationToken: "next-page",
        })
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: "audio/intro.mp3",
              Size: 2048,
              LastModified: new Date("2026-01-02T00:00:00.000Z"),
              ETag: '"etag-2"',
            },
          ],
        });

      await expect(mediaStorage.listAll()).resolves.toEqual([
        {
          url: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
          downloadUrl: "/api/cms/media/blob?pathname=covers%2Fhero.jpg&download=1",
          pathname: "covers/hero.jpg",
          contentType: null,
          size: 1024,
          uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
          etag: "etag-1",
        },
        {
          url: "/api/public/media/blob?pathname=audio%2Fintro.mp3",
          downloadUrl: "/api/cms/media/blob?pathname=audio%2Fintro.mp3&download=1",
          pathname: "audio/intro.mp3",
          contentType: null,
          size: 2048,
          uploadedAt: new Date("2026-01-02T00:00:00.000Z"),
          etag: "etag-2",
        },
      ]);

      expect(s3ClientMock.send).toHaveBeenCalledTimes(2);
      const firstCommand = s3ClientMock.send.mock.calls[0]?.[0];
      const secondCommand = s3ClientMock.send.mock.calls[1]?.[0];

      expect(firstCommand).toBeInstanceOf(ListObjectsV2Command);
      expect(commandInput(firstCommand)).toMatchObject({
        Bucket: "middleware-media",
        ContinuationToken: undefined,
      });
      expect(secondCommand).toBeInstanceOf(ListObjectsV2Command);
      expect(commandInput(secondCommand)).toMatchObject({
        Bucket: "middleware-media",
        ContinuationToken: "next-page",
      });
    });
  });

  describe("head", () => {
    it("returns metadata for an object", async () => {
      s3ClientMock.send.mockResolvedValue({
        ContentType: "image/jpeg",
        ContentLength: 1024,
        LastModified: new Date("2026-01-01T00:00:00.000Z"),
        ETag: '"etag-1"',
      });

      await expect(mediaStorage.head("covers/hero.jpg")).resolves.toEqual({
        url: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
        downloadUrl: "/api/cms/media/blob?pathname=covers%2Fhero.jpg&download=1",
        pathname: "covers/hero.jpg",
        contentType: "image/jpeg",
        size: 1024,
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
        etag: "etag-1",
      });

      const command = s3ClientMock.send.mock.calls[0]?.[0];

      expect(command).toBeInstanceOf(HeadObjectCommand);
      expect(commandInput(command)).toMatchObject({
        Bucket: "middleware-media",
        Key: "covers/hero.jpg",
      });
    });

    it("uses explicit fallbacks for missing optional metadata", async () => {
      s3ClientMock.send.mockResolvedValue({});

      await expect(mediaStorage.head("covers/no-metadata.jpg")).resolves.toMatchObject({
        pathname: "covers/no-metadata.jpg",
        contentType: null,
        size: 0,
        uploadedAt: new Date(0),
        etag: "",
      });
    });
  });

  describe("put", () => {
    it("stores a new object when the target does not exist", async () => {
      s3ClientMock.send
        .mockRejectedValueOnce(createS3Error(404))
        .mockResolvedValueOnce({ ETag: '"new-etag"' });

      await expect(
        mediaStorage.put({
          pathname: "covers/new.jpg",
          body: new Uint8Array([1, 2, 3]),
          contentType: "image/jpeg",
          size: 3,
        }),
      ).resolves.toMatchObject({
        pathname: "covers/new.jpg",
        contentType: "image/jpeg",
        size: 3,
        etag: "new-etag",
      });

      const putCommand = s3ClientMock.send.mock.calls[1]?.[0];

      expect(putCommand).toBeInstanceOf(PutObjectCommand);
      expect(commandInput(putCommand)).toMatchObject({
        Bucket: "middleware-media",
        Key: "covers/new.jpg",
        ContentLength: 3,
        ContentType: "image/jpeg",
      });
    });

    it("fails when the target already exists", async () => {
      s3ClientMock.send.mockResolvedValue({ ETag: '"existing"' });

      await expect(
        mediaStorage.put({
          pathname: "covers/existing.jpg",
          body: new Uint8Array([1]),
          contentType: "image/jpeg",
          size: 1,
        }),
      ).rejects.toBeInstanceOf(StorageConflictError);

      expect(s3ClientMock.send).toHaveBeenCalledTimes(1);
      expect(s3ClientMock.send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
    });
  });

  describe("copy", () => {
    it("copies an object when the target does not exist", async () => {
      s3ClientMock.send
        .mockResolvedValueOnce({
          ContentType: "image/jpeg",
          ContentLength: 1024,
          LastModified: new Date("2026-01-01T00:00:00.000Z"),
          ETag: '"source-etag"',
        })
        .mockRejectedValueOnce(createS3Error(404))
        .mockResolvedValueOnce({
          CopyObjectResult: {
            LastModified: new Date("2026-01-03T00:00:00.000Z"),
            ETag: '"copy-etag"',
          },
        });

      await expect(
        mediaStorage.copy("covers/source image.jpg", "covers/target image.jpg"),
      ).resolves.toEqual({
        url: "/api/public/media/blob?pathname=covers%2Ftarget+image.jpg",
        downloadUrl: "/api/cms/media/blob?pathname=covers%2Ftarget+image.jpg&download=1",
        pathname: "covers/target image.jpg",
        contentType: "image/jpeg",
        size: 1024,
        uploadedAt: new Date("2026-01-03T00:00:00.000Z"),
        etag: "copy-etag",
      });

      const copyCommand = s3ClientMock.send.mock.calls[2]?.[0];

      expect(copyCommand).toBeInstanceOf(CopyObjectCommand);
      expect(commandInput(copyCommand)).toMatchObject({
        Bucket: "middleware-media",
        Key: "covers/target image.jpg",
        CopySource: "middleware-media/covers/source%20image.jpg",
        ContentType: "image/jpeg",
        MetadataDirective: "COPY",
      });
    });

    it("fails when the target already exists", async () => {
      s3ClientMock.send
        .mockResolvedValueOnce({ ContentType: "image/jpeg", ContentLength: 1, ETag: '"source"' })
        .mockResolvedValueOnce({ ETag: '"target"' });

      await expect(
        mediaStorage.copy("covers/source.jpg", "covers/target.jpg"),
      ).rejects.toBeInstanceOf(StorageConflictError);

      expect(s3ClientMock.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("delete", () => {
    it("deletes an object with an optional ETag guard", async () => {
      s3ClientMock.send.mockResolvedValue({});

      await expect(
        mediaStorage.delete({ pathname: "covers/hero.jpg", etag: "etag-1" }),
      ).resolves.toBeUndefined();

      const command = s3ClientMock.send.mock.calls[0]?.[0];

      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(commandInput(command)).toMatchObject({
        Bucket: "middleware-media",
        Key: "covers/hero.jpg",
        IfMatch: "etag-1",
      });
    });
  });

  describe("get", () => {
    it("returns an object with a web stream body", async () => {
      const stream = new Response("image-bytes").body;

      s3ClientMock.send.mockResolvedValue({
        Body: stream,
        ContentType: "image/jpeg",
        ContentLength: 1024,
        LastModified: new Date("2026-01-01T00:00:00.000Z"),
        ETag: '"etag-1"',
      });

      const object = await mediaStorage.get("covers/hero.jpg");

      expect(object).toMatchObject({
        pathname: "covers/hero.jpg",
        contentType: "image/jpeg",
        size: 1024,
        uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
        etag: "etag-1",
      });
      await expect(new Response(object.stream).text()).resolves.toBe("image-bytes");

      const command = s3ClientMock.send.mock.calls[0]?.[0];

      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(commandInput(command)).toMatchObject({
        Bucket: "middleware-media",
        Key: "covers/hero.jpg",
      });
    });

    it("converts a Node stream body to a web stream", async () => {
      s3ClientMock.send.mockResolvedValue({
        Body: Readable.from([new TextEncoder().encode("audio-bytes")]),
      });

      const object = await mediaStorage.get("audio/intro.mp3");

      await expect(new Response(object.stream).text()).resolves.toBe("audio-bytes");
    });

    it("passes byte ranges to S3 get requests", async () => {
      const stream = new Response("partial").body;

      s3ClientMock.send.mockResolvedValue({ Body: stream });

      await mediaStorage.get("audio/intro.mp3", { range: "bytes=10-99" });

      const command = s3ClientMock.send.mock.calls[0]?.[0];

      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(commandInput(command)).toMatchObject({
        Bucket: "middleware-media",
        Key: "audio/intro.mp3",
        Range: "bytes=10-99",
      });
    });

    it("fails when the object body is missing", async () => {
      s3ClientMock.send.mockResolvedValue({});

      await expect(mediaStorage.get("covers/missing-body.jpg")).rejects.toBeInstanceOf(
        StorageNotFoundError,
      );
    });
  });

  describe("S3 error mapping", () => {
    it.each([
      { error: createS3Error(404), expected: StorageNotFoundError },
      {
        error: new NoSuchKey({ $metadata: { httpStatusCode: 404 }, message: "missing" }),
        expected: StorageNotFoundError,
      },
      {
        error: new NotFound({ $metadata: { httpStatusCode: 404 }, message: "missing" }),
        expected: StorageNotFoundError,
      },
      { error: createS3Error(409), expected: StorageConflictError },
      { error: createS3Error(412), expected: StorageConflictError },
      { error: createS3Error(403), expected: StorageAccessError },
    ])("maps $error to $expected.name", async ({ error, expected }) => {
      s3ClientMock.send.mockRejectedValue(error);

      await expect(mediaStorage.head("covers/error.jpg")).rejects.toBeInstanceOf(expected);
    });

    it("rethrows unknown errors unchanged", async () => {
      const error = new Error("network unavailable");

      s3ClientMock.send.mockRejectedValue(error);

      await expect(mediaStorage.head("covers/error.jpg")).rejects.toBe(error);
    });
  });
});
