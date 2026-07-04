import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

import { getS3Config } from "@/lib/server/storage/s3-config";

const globalForS3 = globalThis as typeof globalThis & {
  s3Client?: S3Client;
};

export function getS3Client() {
  if (globalForS3.s3Client) {
    return globalForS3.s3Client;
  }

  const config = getS3Config();

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForS3.s3Client = client;
  }

  return client;
}
