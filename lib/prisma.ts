import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

type PrismaPgConfig = ConstructorParameters<typeof PrismaPg>[0];

function createPgConfig(rawValue: string): PrismaPgConfig {
  try {
    const url = new URL(rawValue);
    const sslmode = url.searchParams.get("sslmode");

    if (sslmode && sslmode !== "disable") {
      return normalizeConnectionString(rawValue);
    }

    return {
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      host: url.hostname,
      password: decodeURIComponent(url.password),
      port: url.port ? Number(url.port) : undefined,
      user: decodeURIComponent(url.username),
    };
  } catch {
    return rawValue;
  }
}

function normalizeConnectionString(rawValue: string): string {
  try {
    const url = new URL(rawValue);
    const sslmode = url.searchParams.get("sslmode");
    const useLibpqCompat = url.searchParams.get("uselibpqcompat");

    if (sslmode === "require" && useLibpqCompat !== "true") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }

    return rawValue;
  } catch {
    return rawValue;
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg(createPgConfig(connectionString));

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function hasCurrentSchema(client: PrismaClient | undefined) {
  if (!client) {
    return false;
  }

  const runtimeModels = (
    client as PrismaClient & {
      _runtimeDataModel?: {
        models?: {
          Issue?: {
            fields?: Array<{ name?: string }>;
          };
          Article?: {
            fields?: Array<{ name?: string }>;
          };
          Author?: unknown;
        };
      };
    }
  )._runtimeDataModel?.models;

  const articleRuntimeFields = runtimeModels?.Article?.fields;
  const issueRuntimeFields = runtimeModels?.Issue?.fields;

  if (Array.isArray(articleRuntimeFields) && Array.isArray(issueRuntimeFields)) {
    return (
      Boolean(runtimeModels?.Author) &&
      articleRuntimeFields.some((field) => field?.name === "excerptRich") &&
      issueRuntimeFields.some((field) => field?.name === "homeBlocks")
    );
  }

  const inlineSchema = (
    client as PrismaClient & {
      _engineConfig?: {
        inlineSchema?: string;
      };
    }
  )._engineConfig?.inlineSchema;

  if (typeof inlineSchema === "string") {
    return (
      inlineSchema.includes("model Author") &&
      inlineSchema.includes("excerptRich") &&
      inlineSchema.includes("homeBlocks")
    );
  }

  return true;
}

const existingPrisma = globalForPrisma.prisma;
const shouldReuseExistingPrisma = hasCurrentSchema(existingPrisma);

if (existingPrisma && !shouldReuseExistingPrisma) {
  void existingPrisma.$disconnect().catch(() => undefined);
}

export const prisma =
  (shouldReuseExistingPrisma ? existingPrisma : undefined) ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
