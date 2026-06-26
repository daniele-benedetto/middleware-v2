import { getRedisClient } from "@/lib/redis";
import { authRateLimitStorage } from "@/lib/server/auth/rate-limit";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(),
}));

const getRedisClientMock = vi.mocked(getRedisClient);

describe("authRateLimitStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getRedisClientMock.mockReset();
  });

  it("allows requests outside production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "test");
    getRedisClientMock.mockResolvedValue(null);

    await expect(authRateLimitStorage.consume?.("login", { window: 60, max: 5 })).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
  });

  it("allows requests under the Redis counter limit", async () => {
    const redis = {
      eval: vi.fn().mockResolvedValue([3, 42]),
    };
    getRedisClientMock.mockResolvedValue(redis as never);

    await expect(authRateLimitStorage.consume?.("login", { window: 60, max: 5 })).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
    expect(redis.eval).toHaveBeenCalledWith(expect.stringContaining("INCR"), {
      keys: ["better-auth:rate-limit:login"],
      arguments: ["60"],
    });
  });

  it("denies requests over the Redis counter limit", async () => {
    const redis = {
      eval: vi.fn().mockResolvedValue([6, 30]),
    };
    getRedisClientMock.mockResolvedValue(redis as never);

    await expect(authRateLimitStorage.consume?.("login", { window: 60, max: 5 })).resolves.toEqual({
      allowed: false,
      retryAfter: 30,
    });
  });

  it("fails closed in production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getRedisClientMock.mockResolvedValue(null);

    await expect(authRateLimitStorage.consume?.("login", { window: 60, max: 5 })).rejects.toThrow(
      "Redis auth rate limit backend is unavailable",
    );
  });
});
