import "server-only";

import { createHash } from "node:crypto";

import { telemetryMetadataSchema } from "@/lib/server/modules/telemetry/schema";

import type { ErrorLogSource, TelemetryMetadata } from "@/lib/server/modules/telemetry/schema";

const technicalPathPrefixes = ["/_next", "/api", "/cms"] as const;
const technicalPaths = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml"]);

type DailyVisitorHashInput = {
  ipAddress: string | null | undefined;
  userAgent: string | null | undefined;
  date?: Date;
  saltSecret?: string;
};

type ErrorFingerprintInput = {
  source: ErrorLogSource;
  name?: string | null;
  message: string;
  path?: string | null;
  routePath?: string | null;
  digest?: string | null;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function redactVolatileMessageParts(value: string) {
  return normalizeWhitespace(value)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/\b[0-9a-f]{24,}\b/gi, "[hex]")
    .slice(0, 500);
}

export function deriveDailyVisitorHash({
  ipAddress,
  userAgent,
  date = new Date(),
  saltSecret = process.env.ANALYTICS_SALT_SECRET,
}: DailyVisitorHashInput) {
  if (!saltSecret) {
    throw new Error("ANALYTICS_SALT_SECRET is required for telemetry visitor hashing");
  }

  return sha256(`${ipAddress ?? ""}|${userAgent ?? ""}|${toUtcDateKey(date)}|${saltSecret}`);
}

export function normalizeTelemetryPath(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "/";
  }

  try {
    const url = new URL(trimmedValue, "https://telemetry.local");
    return url.pathname.slice(0, 512) || "/";
  } catch {
    return "/";
  }
}

export function shouldSkipTelemetryPath(path: string) {
  const normalizedPath = normalizeTelemetryPath(path);

  return (
    technicalPaths.has(normalizedPath) ||
    technicalPathPrefixes.some(
      (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
    )
  );
}

export function normalizeTelemetryReferrer(
  value: string | null | undefined,
  siteOrigin = process.env.NEXT_PUBLIC_SITE_URL,
) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const referrerUrl = new URL(trimmedValue);
    const siteUrl = siteOrigin ? new URL(siteOrigin) : null;

    if (siteUrl && referrerUrl.origin === siteUrl.origin) {
      return referrerUrl.pathname.slice(0, 512) || "/";
    }

    return referrerUrl.hostname.slice(0, 512);
  } catch {
    return null;
  }
}

export function sanitizeTelemetryMetadata(value: unknown): TelemetryMetadata | undefined {
  const result = telemetryMetadataSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export function createErrorFingerprint({
  source,
  name,
  message,
  path,
  routePath,
  digest,
}: ErrorFingerprintInput) {
  return sha256(
    [
      source,
      name ? normalizeWhitespace(name) : "",
      redactVolatileMessageParts(message),
      routePath ? normalizeTelemetryPath(routePath) : "",
      path ? normalizeTelemetryPath(path) : "",
      digest ?? "",
    ].join("|"),
  );
}

export const telemetryService = {
  createErrorFingerprint,
  deriveDailyVisitorHash,
  normalizeTelemetryPath,
  normalizeTelemetryReferrer,
  sanitizeTelemetryMetadata,
  shouldSkipTelemetryPath,
};
