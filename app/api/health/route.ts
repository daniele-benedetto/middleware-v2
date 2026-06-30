import { NextResponse } from "next/server";

type CheckStatus = "ok" | "error";

type HealthCheck = {
  status: CheckStatus;
  message?: string;
};

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown health check error";
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const { prisma } = await import("@/lib/prisma");

    await prisma.$queryRaw`SELECT 1`;

    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: serializeError(error) };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  try {
    const { getRedisClient } = await import("@/lib/redis");
    const redis = await getRedisClient();

    if (!redis) {
      return { status: "error", message: "Redis client unavailable" };
    }

    await redis.ping();

    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: serializeError(error) };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const timestamp = new Date().toISOString();

  if (url.searchParams.get("deep") !== "1") {
    return NextResponse.json({ ok: true, status: "ok", timestamp });
  }

  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const ok = database.status === "ok" && redis.status === "ok";

  return NextResponse.json(
    {
      ok,
      status: ok ? "ok" : "error",
      timestamp,
      checks: {
        app: { status: "ok" satisfies CheckStatus },
        database,
        redis,
      },
    },
    { status: ok ? 200 : 503 },
  );
}
