import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

function normalizeConnectionString(rawValue: string): string {
  try {
    const url = new URL(rawValue);
    const sslmode = url.searchParams.get("sslmode");
    const useLibpqCompat = url.searchParams.get("uselibpqcompat");

    // `pg` currently treats `require` as an alias of `verify-full` and warns that
    // the alias will change semantics in the next major version. Normalize now so
    // runtime behavior stays explicit and the warning disappears.
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

const adapter = new PrismaPg({ connectionString: normalizeConnectionString(connectionString) });

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
