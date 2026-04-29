import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });

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
