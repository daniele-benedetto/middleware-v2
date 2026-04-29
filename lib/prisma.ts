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

function hasCurrentArticleSchema(client: PrismaClient | undefined) {
  if (!client) {
    return false;
  }

  const runtimeFields = (
    client as PrismaClient & {
      _runtimeDataModel?: {
        models?: {
          Article?: {
            fields?: Array<{ name?: string }>;
          };
        };
      };
    }
  )._runtimeDataModel?.models?.Article?.fields;

  if (Array.isArray(runtimeFields)) {
    return runtimeFields.some((field) => field?.name === "excerptRich");
  }

  const inlineSchema = (
    client as PrismaClient & {
      _engineConfig?: {
        inlineSchema?: string;
      };
    }
  )._engineConfig?.inlineSchema;

  if (typeof inlineSchema === "string") {
    return inlineSchema.includes("excerptRich");
  }

  return true;
}

const existingPrisma = globalForPrisma.prisma;
const shouldReuseExistingPrisma = hasCurrentArticleSchema(existingPrisma);

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
