import "server-only";

import { createHash } from "node:crypto";

import { telemetryRepository } from "@/lib/server/modules/telemetry/repository";
import { telemetryMetadataSchema } from "@/lib/server/modules/telemetry/schema";

import type {
  ClientErrorTelemetryPayload,
  ErrorLogSource,
  TelemetryCollectorPayload,
  TelemetryMetadata,
} from "@/lib/server/modules/telemetry/schema";

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

type TelemetryRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  country?: string | null;
  method?: string | null;
  requestId?: string | null;
};

type ServerErrorTelemetryInput = {
  source: "server";
  name?: string | null;
  message: string;
  digest?: string | null;
  path?: string | null;
  method?: string | null;
  routePath?: string | null;
  routeType?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
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

function truncate(value: string | null | undefined, maxLength: number) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;
  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

function readCountry(value: string | null | undefined) {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || normalizedValue.length !== 2) {
    return null;
  }

  return normalizedValue;
}

function buildVisitorHash(context: TelemetryRequestContext) {
  return deriveDailyVisitorHash({
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}

async function recordAnalyticsPayload(
  payload: Extract<TelemetryCollectorPayload, { type: "analytics" }>,
  context: TelemetryRequestContext,
) {
  const path = normalizeTelemetryPath(payload.path);

  if (shouldSkipTelemetryPath(path)) {
    return;
  }

  await telemetryRepository.createAnalyticsEvent({
    event: payload.event,
    path,
    referrer: normalizeTelemetryReferrer(payload.referrer),
    country: readCountry(context.country),
    visitorHash: buildVisitorHash(context),
    metadata: sanitizeTelemetryMetadata(payload.metadata),
  });
}

async function recordWebVitalPayload(
  payload: Extract<TelemetryCollectorPayload, { type: "web-vital" }>,
  context: TelemetryRequestContext,
) {
  const path = normalizeTelemetryPath(payload.path);

  if (shouldSkipTelemetryPath(path)) {
    return;
  }

  await telemetryRepository.createWebVital({
    metricId: payload.metricId,
    name: payload.name,
    value: payload.value,
    delta: payload.delta,
    rating: payload.rating ?? null,
    navigationType: truncate(payload.navigationType, 80),
    path,
    visitorHash: buildVisitorHash(context),
  });
}

async function recordClientErrorPayload(
  payload: ClientErrorTelemetryPayload,
  context: TelemetryRequestContext,
) {
  const path = payload.path ? normalizeTelemetryPath(payload.path) : null;
  const message = truncate(payload.message, 1000) ?? "Unknown client error";
  const name = truncate(payload.name, 120);
  const digest = truncate(payload.digest, 160);

  await telemetryRepository.upsertErrorLog({
    fingerprint: createErrorFingerprint({
      source: payload.source,
      name,
      message,
      path,
      digest,
    }),
    source: payload.source,
    name,
    message,
    digest,
    path,
    method: context.method,
    requestId: context.requestId,
    userAgent: truncate(context.userAgent, 500),
    metadata: sanitizeTelemetryMetadata(payload.metadata),
  });
}

export async function recordTelemetryPayload(
  payload: TelemetryCollectorPayload,
  context: TelemetryRequestContext,
) {
  if (payload.type === "analytics") {
    await recordAnalyticsPayload(payload, context);
    return;
  }

  if (payload.type === "web-vital") {
    await recordWebVitalPayload(payload, context);
    return;
  }

  await recordClientErrorPayload(payload, context);
}

export async function recordServerError(input: ServerErrorTelemetryInput) {
  const path = input.path ? normalizeTelemetryPath(input.path) : null;
  const routePath = input.routePath ? normalizeTelemetryPath(input.routePath) : null;
  const message = truncate(input.message, 1000) ?? "Unknown server error";
  const name = truncate(input.name, 120);
  const digest = truncate(input.digest, 160);

  await telemetryRepository.upsertErrorLog({
    fingerprint: createErrorFingerprint({
      source: input.source,
      name,
      message,
      path,
      routePath,
      digest,
    }),
    source: input.source,
    name,
    message,
    digest,
    path,
    method: truncate(input.method, 20),
    routePath,
    routeType: truncate(input.routeType, 80),
    requestId: truncate(input.requestId, 200),
    userAgent: truncate(input.userAgent, 500),
    metadata: sanitizeTelemetryMetadata(input.metadata),
  });
}

export const telemetryService = {
  createErrorFingerprint,
  deriveDailyVisitorHash,
  normalizeTelemetryPath,
  normalizeTelemetryReferrer,
  recordServerError,
  recordTelemetryPayload,
  sanitizeTelemetryMetadata,
  shouldSkipTelemetryPath,
};
