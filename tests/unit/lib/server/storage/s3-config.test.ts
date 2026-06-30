import { afterEach, describe, expect, it, vi } from "vitest";

import { getS3Config } from "@/lib/server/storage/s3-config";

const envKeys = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "S3_FORCE_PATH_STYLE",
] as const;

function clearS3Env() {
  for (const key of envKeys) {
    vi.stubEnv(key, undefined);
  }
}

describe("getS3Config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads S3 configuration from environment variables", () => {
    vi.stubEnv("S3_ENDPOINT", "http://localhost:9000");
    vi.stubEnv("S3_REGION", "eu-central-1");
    vi.stubEnv("S3_BUCKET", "media");
    vi.stubEnv("S3_ACCESS_KEY", "access-key");
    vi.stubEnv("S3_SECRET_KEY", "secret-key");
    vi.stubEnv("S3_FORCE_PATH_STYLE", "true");

    expect(getS3Config()).toEqual({
      endpoint: "http://localhost:9000",
      region: "eu-central-1",
      bucket: "media",
      accessKey: "access-key",
      secretKey: "secret-key",
      forcePathStyle: true,
    });
  });

  it("fails when required S3 configuration is missing", () => {
    clearS3Env();

    expect(() => getS3Config()).toThrow("S3_ENDPOINT is required");
  });

  it("allows disabling path-style requests explicitly", () => {
    vi.stubEnv("S3_ENDPOINT", "https://s3.example.com");
    vi.stubEnv("S3_REGION", "eu-central-1");
    vi.stubEnv("S3_BUCKET", "media");
    vi.stubEnv("S3_ACCESS_KEY", "access-key");
    vi.stubEnv("S3_SECRET_KEY", "secret-key");
    vi.stubEnv("S3_FORCE_PATH_STYLE", "false");

    expect(getS3Config().forcePathStyle).toBe(false);
  });
});
