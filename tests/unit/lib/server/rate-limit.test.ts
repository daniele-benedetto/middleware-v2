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

function readLoggedPayload(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse(String(spy.mock.calls[0]?.[0])) as {
    event: string;
    level: string;
    path: string;
    method: string;
    metadata: { policy: string };
    error: { message: string };
  };
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

    expect(readLoggedPayload(consoleErrorSpy)).toMatchObject({
      event: "RATE_LIMIT_BACKEND_UNAVAILABLE",
      level: "error",
      path: "/api/test-rate-limit-production-down",
      method: "POST",
      metadata: { policy: "test-rate-limit-production-down" },
      error: { message: "Redis unavailable" },
    });
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

    expect(readLoggedPayload(consoleErrorSpy)).toMatchObject({
      event: "RATE_LIMIT_BACKEND_UNAVAILABLE",
      level: "error",
      path: "/api/test-rate-limit-production-missing",
      method: "POST",
      metadata: { policy: "test-rate-limit-production-missing" },
      error: { message: "Redis rate limit backend is unavailable" },
    });
  });
});
