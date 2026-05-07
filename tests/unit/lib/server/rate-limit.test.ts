import { getRedisClient } from "@/lib/redis";
import { enforceRateLimit } from "@/lib/server/http/rate-limit";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(),
}));

const getRedisClientMock = vi.mocked(getRedisClient);

function createRequest(pathname: string) {
  return new Request(`https://example.com${pathname}`, {
    method: "POST",
    headers: {
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("enforceRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getRedisClientMock.mockReset();
  });

  it("falls back to in-memory outside production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "test");
    getRedisClientMock.mockRejectedValue(new Error("Redis unavailable"));

    const request = createRequest("/api/test-rate-limit-fallback");
    const policy = {
      name: "test-rate-limit-fallback",
      limit: 1,
      windowMs: 60_000,
    };

    await expect(enforceRateLimit(request, policy)).resolves.toBeUndefined();
    await expect(enforceRateLimit(request, policy)).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      message: "Rate limit exceeded for this endpoint",
    });
  });

  it("fails closed in production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getRedisClientMock.mockRejectedValue(new Error("Redis unavailable"));

    await expect(
      enforceRateLimit(createRequest("/api/test-rate-limit-production-down"), {
        name: "test-rate-limit-production-down",
        limit: 10,
        windowMs: 60_000,
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Rate limit backend unavailable",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "RATE_LIMIT_BACKEND_UNAVAILABLE",
      expect.any(Error),
    );
  });

  it("fails closed in production when Redis is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getRedisClientMock.mockResolvedValue(null);

    await expect(
      enforceRateLimit(createRequest("/api/test-rate-limit-production-missing"), {
        name: "test-rate-limit-production-missing",
        limit: 10,
        windowMs: 60_000,
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Rate limit backend unavailable",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "RATE_LIMIT_BACKEND_UNAVAILABLE",
      expect.any(Error),
    );
  });
});
