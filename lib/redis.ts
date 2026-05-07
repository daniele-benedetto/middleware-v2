import "server-only";

import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: RedisClient | null;
  redisClientPromise?: Promise<RedisClient | null>;
};

function readRedisUrl(): string | null {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (redisUrl) {
    return redisUrl;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is not set");
  }

  return null;
}

function createRedisSingleton(): Promise<RedisClient | null> {
  const redisUrl = readRedisUrl();

  if (!redisUrl) {
    return Promise.resolve(null);
  }

  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    console.error("Redis client error", error);
  });

  return client.connect().then(() => client);
}

export async function getRedisClient(): Promise<RedisClient | null> {
  if (globalForRedis.redisClient?.isReady) {
    return globalForRedis.redisClient;
  }

  if (globalForRedis.redisClientPromise) {
    return globalForRedis.redisClientPromise;
  }

  globalForRedis.redisClientPromise = createRedisSingleton()
    .then((client) => {
      globalForRedis.redisClient = client;
      return client;
    })
    .finally(() => {
      globalForRedis.redisClientPromise = undefined;
    });

  return globalForRedis.redisClientPromise;
}
