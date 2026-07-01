import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import {
  assessLikelyBot,
  evaluateClientTimingSanity,
  normalizeSampleRate,
} from "@/lib/server/modules/observability/model";
import { observabilityMetadataSchema } from "@/lib/server/modules/telemetry/schema";

import type {
  ObservabilityErrorSeverity as PrismaObservabilityErrorSeverity,
  ObservabilityErrorSource as PrismaObservabilityErrorSource,
  ObservabilityImpactArea as PrismaObservabilityImpactArea,
  ObservabilityUserImpact as PrismaObservabilityUserImpact,
} from "@/lib/generated/prisma/enums";
import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  TelemetryContentEngagementDetailDto,
  TelemetryEngagementSummaryDto,
  TelemetryErrorGroupDetailDto,
  TelemetryErrorGroupDto,
  TelemetryErrorOccurrenceDto,
  TelemetryTopContentDto,
} from "@/lib/server/modules/telemetry/dto";
import type {
  ContentEngagementDetailQuery,
  ListContentEngagementQuery,
  ListTelemetryErrorsQuery,
  ObservabilityErrorSource,
  ObservabilityErrorStatus,
  ObservabilityMetadata,
  TelemetryEngagementQuery,
  TelemetryCollectorEvent,
  TelemetryCollectorPayload,
} from "@/lib/server/modules/telemetry/schema";

const technicalPathPrefixes = ["/_next", "/api", "/cms"] as const;
const technicalPaths = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml"]);
const fingerprintVersion = 1;
const maxHeartbeatContributionMs = 20_000;
const maxExitContributionMs = 30_000;
const engagementThresholdVersion = "engagement-v1";
const engagementThresholds = {
  article: {
    scanScroll: 25,
    engagedScroll: 50,
    completedScroll: 85,
    scanActiveMs: 5_000,
    engagedActiveMs: 30_000,
    completedActiveMs: 45_000,
  },
  home: {
    scanScroll: 25,
    engagedScroll: 50,
    completedScroll: 90,
    scanActiveMs: 5_000,
    engagedActiveMs: 30_000,
    completedActiveMs: 60_000,
  },
  issue: {
    scanScroll: 25,
    engagedScroll: 50,
    completedScroll: 90,
    scanActiveMs: 5_000,
    engagedActiveMs: 30_000,
    completedActiveMs: 60_000,
  },
  listen: { engagedCompletionRate: 0.25, completedCompletionRate: 0.9, engagedActiveMs: 30_000 },
  media: { scanActiveMs: 5_000, engagedActiveMs: 15_000 },
} as const;

type DailyVisitorHashInput = {
  ipAddress: string | null | undefined;
  userAgent: string | null | undefined;
  date?: Date;
  saltSecret?: string;
};

type TelemetryRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
  country?: string | null;
  method?: string | null;
  requestId?: string | null;
  doNotTrack?: string | null;
  globalPrivacyControl?: string | null;
};

type ServerErrorTelemetryInput = {
  source: "server";
  name?: string | null;
  message: string;
  digest?: string | null;
  stack?: string | null;
  path?: string | null;
  method?: string | null;
  routePath?: string | null;
  routeType?: string | null;
  statusCode?: number | null;
  actionContext?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  userAgent?: string | null;
  release?: string | null;
  metadata?: unknown;
};

type ErrorGroupRecord = {
  id: string;
  fingerprint: string;
  fingerprintVersion: number;
  errorSignature: string;
  title: string;
  source: string;
  severity: string;
  status: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  occurrenceCount: number;
  affectedSessions: number;
  affectedPaths: unknown;
  impactArea: string;
  userImpact: string;
  regression: boolean;
  firstRelease: string | null;
  lastRelease: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
};

type ErrorOccurrenceRecord = {
  id: string;
  sessionId: string | null;
  requestId: string | null;
  correlationId: string | null;
  path: string | null;
  routePath: string | null;
  routeType: string | null;
  method: string | null;
  statusCode: number | null;
  actionContext: string | null;
  userAgent: string | null;
  stackTraceRedacted: string | null;
  metadata: unknown;
  occurredAt: Date;
};

type ErrorGroupDetailRecord = ErrorGroupRecord & {
  occurrences: ErrorOccurrenceRecord[];
};

type ContentEngagementRecord = {
  id: string;
  contentId: string | null;
  slug: string | null;
  path: string;
  pageType: string;
  contentType: string | null;
  firstSeenAt: Date;
  activeTimeMs: number;
  maxScrollDepth: number;
  scrollMilestones: unknown;
  interactionCount: number;
  completed: boolean;
  engagementLevel: string;
  exitType: string;
  returnCountInSession: number;
  refreshCount: number;
  lastSeenAt: Date;
};

async function getTelemetryRepository() {
  const { telemetryRepository } = await import("@/lib/server/modules/telemetry/repository");
  return telemetryRepository;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function truncate(value: string | null | undefined, maxLength: number) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;
  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

function normalizeToken(value: string) {
  return normalizeWhitespace(value)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/\b[0-9a-f]{16,}\b/gi, "[hex]")
    .replace(/\b\d{4,}\b/g, "[number]")
    .replace(/\?.*$/g, "")
    .slice(0, 500);
}

function redactStackTrace(value: string | null | undefined) {
  const normalizedValue = value ? normalizeWhitespace(value) : null;

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/token=([^\s&]+)/gi, "token=[redacted]")
    .slice(0, 8000);
}

function normalizeStackFrames(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("node_modules"))
    .slice(0, 5)
    .map((line) =>
      normalizeToken(line)
        .replace(/:\d+:\d+/g, "")
        .replace(/:\d+/g, "")
        .replace(/file:\/\/[^\s)]+/g, "[file]"),
    );
}

function readCountry(value: string | null | undefined) {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || normalizedValue.length !== 2) {
    return null;
  }

  return normalizedValue;
}

function readAffectedPaths(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toLowerEnum(value: string) {
  return value.toLowerCase();
}

function toPrismaSource(value: ObservabilityErrorSource): PrismaObservabilityErrorSource {
  return value.toUpperCase() as PrismaObservabilityErrorSource;
}

function normalizeNullablePath(value: string | null | undefined) {
  return value ? normalizeTelemetryPath(value) : null;
}

function buildVisitorHash(context: TelemetryRequestContext) {
  return deriveDailyVisitorHash({
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}

function toEventCategory(type: string) {
  if (type.startsWith("session_")) {
    return "SESSION" as const;
  }

  if (
    type === "page_enter" ||
    type === "page_exit" ||
    type === "visibility_change" ||
    type === "navigation_click"
  ) {
    return "NAVIGATION" as const;
  }

  if (
    type === "scroll_milestone" ||
    type === "content_interaction" ||
    type.startsWith("audio_") ||
    type.startsWith("media_")
  ) {
    return "INTERACTION" as const;
  }

  return "ERROR" as const;
}

function readMetadataNumber(metadata: ObservabilityMetadata | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readMetadataString(metadata: ObservabilityMetadata | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function clampPercent(value: number | null) {
  return value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
}

function calculateActiveTimeDelta(input: {
  event: TelemetryCollectorEvent;
  previousClientElapsedMs?: number | null;
}) {
  if (input.previousClientElapsedMs === null || input.previousClientElapsedMs === undefined) {
    return 0;
  }

  const delta = input.event.clientElapsedMs - input.previousClientElapsedMs;

  if (delta <= 0) {
    return 0;
  }

  if (input.event.type === "session_heartbeat") {
    return Math.min(delta, maxHeartbeatContributionMs);
  }

  if (input.event.type === "page_exit") {
    return Math.min(delta, maxExitContributionMs);
  }

  return 0;
}

function deriveEngagementLevel(input: {
  pageType?: string | null;
  activeTimeDeltaMs: number;
  scrollDepth: number;
  interactionDelta: number;
  audioCompleted: boolean;
  audioCompletionRate: number;
}) {
  if (input.pageType === "listen") {
    if (
      input.audioCompleted ||
      input.audioCompletionRate >= engagementThresholds.listen.completedCompletionRate
    ) {
      return "completed";
    }

    if (
      input.audioCompletionRate >= engagementThresholds.listen.engagedCompletionRate ||
      input.activeTimeDeltaMs >= engagementThresholds.listen.engagedActiveMs
    ) {
      return "engaged";
    }

    return input.interactionDelta > 0 ? "scan" : "glance";
  }

  if (input.pageType === "home" || input.pageType === "issue") {
    const thresholds =
      input.pageType === "home" ? engagementThresholds.home : engagementThresholds.issue;

    if (input.scrollDepth >= thresholds.completedScroll && input.interactionDelta > 0) {
      return "completed";
    }

    if (
      input.scrollDepth >= thresholds.engagedScroll ||
      input.interactionDelta >= 2 ||
      input.activeTimeDeltaMs >= thresholds.engagedActiveMs
    ) {
      return "engaged";
    }

    return input.scrollDepth >= thresholds.scanScroll || input.interactionDelta > 0
      ? "scan"
      : "glance";
  }

  if (input.pageType === "media") {
    if (input.audioCompleted) return "completed";
    if (
      input.activeTimeDeltaMs >= engagementThresholds.media.engagedActiveMs ||
      input.interactionDelta > 0
    ) {
      return "engaged";
    }
    return input.activeTimeDeltaMs >= engagementThresholds.media.scanActiveMs ? "scan" : "glance";
  }

  if (
    input.scrollDepth >= engagementThresholds.article.completedScroll &&
    input.activeTimeDeltaMs >= engagementThresholds.article.completedActiveMs
  ) {
    return "completed";
  }

  if (
    input.scrollDepth >= engagementThresholds.article.engagedScroll &&
    input.activeTimeDeltaMs >= engagementThresholds.article.engagedActiveMs
  ) {
    return "engaged";
  }

  return input.scrollDepth >= engagementThresholds.article.scanScroll ||
    input.activeTimeDeltaMs >= engagementThresholds.article.scanActiveMs ||
    input.interactionDelta > 0
    ? "scan"
    : "glance";
}

function isEngagementEvent(type: string) {
  return (
    type === "page_enter" ||
    type === "page_exit" ||
    type === "session_heartbeat" ||
    type === "scroll_milestone" ||
    type === "content_interaction" ||
    type === "navigation_click" ||
    type.startsWith("audio_") ||
    type.startsWith("media_")
  );
}

function isAudioEvent(type: string) {
  return type.startsWith("audio_");
}

function readInteractionCount(events: TelemetryCollectorEvent[]) {
  return events.reduce((count, event) => {
    const value = event.metadata?.interactionCount;
    return count + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function readHeadlessMarker(events: TelemetryCollectorEvent[]) {
  return events.some((event) => event.metadata?.headless === true);
}

function resolveLikelyBot(input: {
  userAgent?: string | null;
  events: TelemetryCollectorEvent[];
  timingSuspicious: boolean;
}) {
  return assessLikelyBot({
    userAgent: input.userAgent,
    heartbeatCount: input.events.filter((event) => event.type === "session_heartbeat").length,
    scrollEventCount: input.events.filter((event) => event.type === "scroll_milestone").length,
    interactionCount: readInteractionCount(input.events),
    headlessMarker: readHeadlessMarker(input.events),
    suspiciousHeaderMismatch: input.timingSuspicious,
  });
}

function withDiagnosticMetadata(input: {
  metadata?: ObservabilityMetadata;
  collectionMode: string;
  pageInstanceId: string;
  timingReasons: string[];
  botReasons: string[];
}) {
  const metadata: Record<string, string | number | boolean | null> = {
    ...(input.metadata ?? {}),
    collectionMode: input.collectionMode,
    pageInstanceId: input.pageInstanceId,
  };

  if (input.timingReasons.length > 0) {
    metadata.timingReasons = input.timingReasons.join(",").slice(0, 500);
  }

  if (input.botReasons.length > 0) {
    metadata.botReasons = input.botReasons.join(",").slice(0, 500);
  }

  return sanitizeTelemetryMetadata(metadata) as Prisma.InputJsonValue | undefined;
}

function createErrorTitle(name: string | null, message: string) {
  return truncate(`${name ? `${name}: ` : ""}${message}`, 180) ?? "Unknown error";
}

function deriveImpactArea(input: {
  path?: string | null;
  routePath?: string | null;
  actionContext?: string | null;
}) {
  const value =
    `${input.path ?? ""} ${input.routePath ?? ""} ${input.actionContext ?? ""}`.toLowerCase();

  if (value.includes("login") || value.includes("auth")) {
    return "AUTH" as PrismaObservabilityImpactArea;
  }

  if (value.includes("media") || value.includes("upload")) {
    return "MEDIA" as PrismaObservabilityImpactArea;
  }

  if (value.includes("publish") || value.includes("article") || value.includes("editorial")) {
    return "EDITORIAL" as PrismaObservabilityImpactArea;
  }

  if (value.includes("/cms")) {
    return "CMS" as PrismaObservabilityImpactArea;
  }

  if (input.path?.startsWith("/")) {
    return "PUBLIC_SITE" as PrismaObservabilityImpactArea;
  }

  return "UNKNOWN" as PrismaObservabilityImpactArea;
}

function deriveUserImpact(input: {
  statusCode?: number | null;
  actionContext?: string | null;
  routePath?: string | null;
}) {
  const context = `${input.actionContext ?? ""} ${input.routePath ?? ""}`.toLowerCase();

  if (context.includes("publish") || context.includes("upload") || context.includes("login")) {
    return "BLOCKED_ACTION" as PrismaObservabilityUserImpact;
  }

  if (context.includes("save") || context.includes("editor")) {
    return "LOST_CONTENT" as PrismaObservabilityUserImpact;
  }

  if (input.statusCode && input.statusCode >= 500) {
    return "MINOR" as PrismaObservabilityUserImpact;
  }

  return "NONE" as PrismaObservabilityUserImpact;
}

function deriveSeverity(input: {
  source: ObservabilityErrorSource;
  statusCode?: number | null;
  actionContext?: string | null;
  impactArea: PrismaObservabilityImpactArea;
  userImpact: PrismaObservabilityUserImpact;
}) {
  if (input.userImpact === "LOST_CONTENT" || input.statusCode === 401 || input.statusCode === 403) {
    return "CRITICAL" as PrismaObservabilityErrorSeverity;
  }

  if (
    input.userImpact === "BLOCKED_ACTION" ||
    input.statusCode === 500 ||
    input.statusCode === 503 ||
    input.impactArea === "AUTH" ||
    input.impactArea === "MEDIA"
  ) {
    return "HIGH" as PrismaObservabilityErrorSeverity;
  }

  if (input.source === "server" || input.impactArea === "PUBLIC_SITE") {
    return "MEDIUM" as PrismaObservabilityErrorSeverity;
  }

  return "LOW" as PrismaObservabilityErrorSeverity;
}

export function deriveDailyVisitorHash({
  ipAddress,
  userAgent,
  date = new Date(),
  saltSecret = process.env.ANALYTICS_SALT_SECRET,
}: DailyVisitorHashInput) {
  if (!saltSecret) {
    throw new Error("ANALYTICS_SALT_SECRET is required for observability visitor hashing");
  }

  return sha256(`${ipAddress ?? ""}|${userAgent ?? ""}|${toUtcDateKey(date)}|${saltSecret}`);
}

export function normalizeTelemetryPath(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "/";
  }

  try {
    const url = new URL(trimmedValue, "https://observability.local");
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

export function sanitizeTelemetryMetadata(value: unknown): ObservabilityMetadata | undefined {
  const result = observabilityMetadataSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export function createErrorFingerprint(input: {
  source: ObservabilityErrorSource;
  name?: string | null;
  message: string;
  stack?: string | null;
  routePath?: string | null;
  path?: string | null;
  statusCode?: number | null;
}) {
  const frames = normalizeStackFrames(input.stack);
  const routeKey = input.routePath ? normalizeTelemetryPath(input.routePath) : "";

  return sha256(
    [
      `v${fingerprintVersion}`,
      input.source,
      input.name ? normalizeToken(input.name) : "",
      normalizeToken(input.message),
      frames.join("|"),
      routeKey,
      input.statusCode ? `${Math.floor(input.statusCode / 100)}xx` : "",
    ].join("|"),
  );
}

export function createErrorSignature(input: {
  source: ObservabilityErrorSource;
  name?: string | null;
  message: string;
  impactArea: PrismaObservabilityImpactArea;
}) {
  return sha256(
    [
      input.source,
      input.name ? normalizeToken(input.name) : "",
      normalizeToken(input.message),
      input.impactArea,
    ].join("|"),
  );
}

function toOccurrenceDto(record: ErrorOccurrenceRecord): TelemetryErrorOccurrenceDto {
  return {
    id: record.id,
    sessionId: record.sessionId,
    requestId: record.requestId,
    correlationId: record.correlationId,
    path: record.path,
    routePath: record.routePath,
    routeType: record.routeType,
    method: record.method,
    statusCode: record.statusCode,
    actionContext: record.actionContext,
    userAgent: record.userAgent,
    stackTraceRedacted: record.stackTraceRedacted,
    metadata: record.metadata ?? null,
    occurredAt: record.occurredAt.toISOString(),
  };
}

function toErrorGroupDto(record: ErrorGroupRecord): TelemetryErrorGroupDto {
  return {
    id: record.id,
    title: record.title,
    source: toLowerEnum(record.source) as TelemetryErrorGroupDto["source"],
    severity: toLowerEnum(record.severity) as TelemetryErrorGroupDto["severity"],
    status: toLowerEnum(record.status) as TelemetryErrorGroupDto["status"],
    occurrenceCount: record.occurrenceCount,
    affectedSessions: record.affectedSessions,
    affectedPaths: readAffectedPaths(record.affectedPaths),
    impactArea: toLowerEnum(record.impactArea) as TelemetryErrorGroupDto["impactArea"],
    userImpact: toLowerEnum(record.userImpact) as TelemetryErrorGroupDto["userImpact"],
    regression: record.regression,
    firstSeenAt: record.firstSeenAt.toISOString(),
    lastSeenAt: record.lastSeenAt.toISOString(),
  };
}

function toErrorGroupDetailDto(record: ErrorGroupDetailRecord): TelemetryErrorGroupDetailDto {
  return {
    ...toErrorGroupDto(record),
    fingerprint: record.fingerprint,
    fingerprintVersion: record.fingerprintVersion,
    errorSignature: record.errorSignature,
    firstRelease: record.firstRelease,
    lastRelease: record.lastRelease,
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    resolvedBy: record.resolvedBy,
    occurrences: record.occurrences.map(toOccurrenceDto),
  };
}

function isQualifiedEngagement(record: ContentEngagementRecord) {
  return record.engagementLevel === "engaged" || record.engagementLevel === "completed";
}

function toCompletionRate(completedReads: number, qualifiedVisits: number) {
  return qualifiedVisits > 0 ? completedReads / qualifiedVisits : 0;
}

function toSampleConfidence(total: number) {
  if (total >= 100) {
    return "high" as const;
  }

  if (total >= 30) {
    return "medium" as const;
  }

  return "low" as const;
}

function readScrollMilestones(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : [];
}

function summarizeContentRecords(records: ContentEngagementRecord[]) {
  const qualifiedRecords = records.filter(isQualifiedEngagement);
  const completedReads = records.filter((record) => record.completed).length;
  const qualifiedVisits = qualifiedRecords.length;
  const averageActiveTimeMs = qualifiedVisits
    ? Math.round(
        qualifiedRecords.reduce((total, record) => total + record.activeTimeMs, 0) /
          qualifiedVisits,
      )
    : 0;

  return {
    qualifiedVisits,
    completedReads,
    completionRate: toCompletionRate(completedReads, qualifiedVisits),
    averageActiveTimeMs,
  };
}

function toTopContentDto(records: ContentEngagementRecord[]): TelemetryTopContentDto[] {
  const grouped = new Map<string, ContentEngagementRecord[]>();

  for (const record of records) {
    const key = record.contentId ?? record.path;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  return Array.from(grouped.values())
    .map((groupRecords) => {
      const first = groupRecords[0];
      const summary = summarizeContentRecords(groupRecords);

      return {
        contentId: first?.contentId ?? null,
        slug: first?.slug ?? null,
        path: first?.path ?? "/",
        pageType: (first?.pageType ?? "static_page") as TelemetryTopContentDto["pageType"],
        contentType: (first?.contentType ?? null) as TelemetryTopContentDto["contentType"],
        qualifiedVisits: summary.qualifiedVisits,
        completedReads: summary.completedReads,
        completionRate: summary.completionRate,
        averageActiveTimeMs: summary.averageActiveTimeMs,
        returnCountInSession: groupRecords.reduce(
          (total, record) => total + record.returnCountInSession,
          0,
        ),
        refreshCount: groupRecords.reduce((total, record) => total + record.refreshCount, 0),
        lastSeenAt: new Date(
          Math.max(...groupRecords.map((record) => record.lastSeenAt.getTime())),
        ).toISOString(),
      };
    })
    .sort((first, second) => second.qualifiedVisits - first.qualifiedVisits);
}

function toEngagementSummaryDto(records: ContentEngagementRecord[]): TelemetryEngagementSummaryDto {
  const summary = summarizeContentRecords(records);
  const levels = ["glance", "scan", "engaged", "completed"] as const;
  const topContent = toTopContentDto(records);

  return {
    ...summary,
    engagementBreakdown: levels.map((level) => ({
      level,
      count: records.filter((record) => record.engagementLevel === level).length,
    })),
    topContent: topContent.slice(0, 10),
    lowQualityContent: topContent
      .filter((item) => item.qualifiedVisits === 0 && item.completedReads === 0)
      .slice(0, 10),
    sampleConfidence: toSampleConfidence(records.length),
  };
}

function countBy<T extends string | number>(values: T[]) {
  const map = new Map<T, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return map;
}

function toContentEngagementDetailDto(input: {
  records: ContentEngagementRecord[];
  audio: {
    _count: { _all: number };
    _avg: { listenedMs: number | null; completionRate: number | null };
    _sum: { seekCount: number | null; replayCount: number | null };
  };
}): TelemetryContentEngagementDetailDto {
  const first = input.records[0];

  if (!first) {
    throw new ApiError(404, "NOT_FOUND", "Content engagement not found");
  }

  const summary = summarizeContentRecords(input.records);
  const levels = ["glance", "scan", "engaged", "completed"] as const;
  const scrollCounts = countBy(
    input.records.flatMap((record) => readScrollMilestones(record.scrollMilestones)),
  );
  const exitCounts = countBy(input.records.map((record) => record.exitType || "unknown"));

  return {
    contentId: first.contentId,
    slug: first.slug,
    path: first.path,
    pageType: first.pageType as TelemetryContentEngagementDetailDto["pageType"],
    contentType: first.contentType as TelemetryContentEngagementDetailDto["contentType"],
    ...summary,
    engagementBreakdown: levels.map((level) => ({
      level,
      count: input.records.filter((record) => record.engagementLevel === level).length,
    })),
    maxScrollDepth: Math.max(...input.records.map((record) => record.maxScrollDepth), 0),
    scrollDistribution: Array.from(scrollCounts.entries()).map(([milestone, count]) => ({
      milestone,
      count,
    })),
    returnCountInSession: input.records.reduce(
      (total, record) => total + record.returnCountInSession,
      0,
    ),
    refreshCount: input.records.reduce((total, record) => total + record.refreshCount, 0),
    exitBreakdown: Array.from(exitCounts.entries()).map(([exitType, count]) => ({
      exitType,
      count,
    })),
    audio:
      input.audio._count._all > 0
        ? {
            starts: input.audio._count._all,
            averageListenedMs: Math.round(input.audio._avg.listenedMs ?? 0),
            averageCompletionRate: input.audio._avg.completionRate ?? 0,
            seekCount: input.audio._sum.seekCount ?? 0,
            replayCount: input.audio._sum.replayCount ?? 0,
          }
        : null,
    sampleConfidence: toSampleConfidence(input.records.length),
  };
}

async function recordError(input: {
  source: ObservabilityErrorSource;
  sessionId?: string | null;
  isLikelyBot?: boolean;
  name?: string | null;
  message: string;
  digest?: string | null;
  stack?: string | null;
  path?: string | null;
  pageType?: string | null;
  contentId?: string | null;
  contentType?: string | null;
  routePath?: string | null;
  routeType?: string | null;
  method?: string | null;
  statusCode?: number | null;
  actionContext?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  release?: string | null;
  sampleRate?: number | null;
  clientSequence?: number | null;
  clientElapsedMs?: number | null;
  metadata?: unknown;
  context: TelemetryRequestContext;
}) {
  const now = new Date();
  const path = normalizeNullablePath(input.path);
  const routePath = normalizeNullablePath(input.routePath);
  const message = truncate(input.message, 1000) ?? "Unknown error";
  const name = truncate(input.name, 120);
  const userAgent = truncate(input.context.userAgent ?? input.context.userAgent ?? null, 500);
  const metadata = sanitizeTelemetryMetadata(input.metadata) as Prisma.InputJsonValue | undefined;
  const stackTraceRedacted = redactStackTrace(input.stack);
  const visitorHash = buildVisitorHash(input.context);
  const impactArea = deriveImpactArea({ path, routePath, actionContext: input.actionContext });
  const userImpact = deriveUserImpact({
    statusCode: input.statusCode,
    actionContext: input.actionContext,
    routePath,
  });
  const severity = deriveSeverity({
    source: input.source,
    statusCode: input.statusCode,
    actionContext: input.actionContext,
    impactArea,
    userImpact,
  });
  const fingerprint = createErrorFingerprint({
    source: input.source,
    name,
    message,
    stack: input.stack,
    routePath,
    path,
    statusCode: input.statusCode,
  });
  const errorSignature = createErrorSignature({ source: input.source, name, message, impactArea });

  const repository = await getTelemetryRepository();

  return repository.recordError({
    session: input.sessionId
      ? {
          id: input.sessionId,
          visitorHash,
          landingPath: path,
          country: readCountry(input.context.country),
          userAgent,
          isLikelyBot: input.isLikelyBot,
        }
      : null,
    event: {
      sessionId: input.sessionId ?? null,
      visitorHash,
      type: `${input.source}_error`,
      path,
      pageType: truncate(input.pageType, 80),
      contentId: truncate(input.contentId, 120),
      contentType: truncate(input.contentType, 80),
      requestId: truncate(input.requestId ?? input.context.requestId, 200),
      correlationId: truncate(input.correlationId, 200),
      release: truncate(input.release, 120),
      sampleRate: input.sampleRate ?? 1,
      clientSequence: input.clientSequence ?? null,
      clientElapsedMs: input.clientElapsedMs ?? null,
      metadata,
      receivedAtServer: now,
    },
    group: {
      fingerprint,
      fingerprintVersion,
      errorSignature,
      title: createErrorTitle(name, message),
      source: toPrismaSource(input.source),
      severity,
      impactArea,
      userImpact,
      release: truncate(input.release, 120),
      path,
    },
    occurrence: {
      sessionId: input.sessionId ?? null,
      requestId: truncate(input.requestId ?? input.context.requestId, 200),
      correlationId: truncate(input.correlationId, 200),
      path,
      routePath,
      routeType: truncate(input.routeType, 80),
      method: truncate(input.method ?? input.context.method, 20),
      statusCode: input.statusCode ?? null,
      actionContext: truncate(input.actionContext, 120),
      userAgent,
      stackTraceRedacted,
      metadata,
      occurredAt: now,
    },
  });
}

async function recordCollectorEvent(input: {
  payload: TelemetryCollectorPayload;
  event: TelemetryCollectorEvent;
  context: TelemetryRequestContext;
  visitorHash: string;
  receivedAtServer: Date;
  isLikelyBot: boolean;
  botReasons: string[];
  previousClientElapsedMs?: number | null;
}) {
  const timing = evaluateClientTimingSanity({
    clientSequence: input.event.clientSequence,
    clientElapsedMs: input.event.clientElapsedMs,
    previousClientElapsedMs: input.previousClientElapsedMs,
  });

  if (!timing.accepted) {
    return;
  }

  const path = normalizeNullablePath(input.event.path);
  const repository = await getTelemetryRepository();
  const metadata = withDiagnosticMetadata({
    metadata: input.event.metadata,
    collectionMode: input.payload.collectionMode,
    pageInstanceId: input.payload.pageInstanceId,
    timingReasons: timing.reasons,
    botReasons: input.botReasons,
  });

  if (input.event.type === "client_error") {
    if (!input.event.message) {
      return;
    }

    await recordError({
      source: input.event.source ?? "client",
      sessionId: input.payload.sessionId,
      isLikelyBot: input.isLikelyBot,
      name: input.event.name,
      message: input.event.message,
      digest: input.event.digest,
      stack: input.event.stack,
      path,
      pageType: input.event.pageType,
      contentId: input.event.contentId,
      contentType: input.event.contentType,
      requestId: input.event.requestId,
      correlationId: input.event.correlationId,
      release: input.event.release,
      sampleRate: normalizeSampleRate(input.event.sampleRate),
      clientSequence: input.event.clientSequence,
      clientElapsedMs: input.event.clientElapsedMs,
      metadata,
      context: input.context,
    });
    return;
  }

  await repository.recordSessionEvent({
    session: {
      id: input.payload.sessionId,
      visitorHash: input.visitorHash,
      observedAt: input.receivedAtServer,
      landingPath:
        input.event.type === "session_start" || input.event.type === "page_enter" ? path : null,
      exitPath:
        input.event.type === "page_exit" || input.event.type === "session_end" ? path : null,
      endedAt: input.event.type === "session_end" ? input.receivedAtServer : null,
      referrerDomain: normalizeTelemetryReferrer(input.payload.referrer),
      country: readCountry(input.context.country),
      userAgent: truncate(input.context.userAgent, 500),
      isLikelyBot: input.isLikelyBot,
    },
    event: {
      sessionId: input.payload.sessionId,
      visitorHash: input.visitorHash,
      type: input.event.type,
      category: toEventCategory(input.event.type),
      path,
      pageType: truncate(input.event.pageType, 80),
      contentId: truncate(input.event.contentId, 120),
      contentType: truncate(input.event.contentType, 80),
      requestId: truncate(input.event.requestId ?? input.context.requestId, 200),
      correlationId: truncate(input.event.correlationId, 200),
      release: truncate(input.event.release, 120),
      sampleRate: normalizeSampleRate(input.event.sampleRate),
      clientSequence: input.event.clientSequence,
      clientElapsedMs: input.event.clientElapsedMs,
      metadata,
      receivedAtServer: input.receivedAtServer,
    },
  });

  if (!isEngagementEvent(input.event.type) || !path) {
    return;
  }

  const maxScrollDepth =
    input.event.type === "scroll_milestone"
      ? clampPercent(readMetadataNumber(input.event.metadata, "milestone"))
      : 0;
  const activeTimeDeltaMs = calculateActiveTimeDelta({
    event: input.event,
    previousClientElapsedMs: input.previousClientElapsedMs,
  });
  const interactionDelta =
    input.event.type === "content_interaction" ||
    input.event.type === "navigation_click" ||
    input.event.type.startsWith("media_")
      ? 1
      : (readMetadataNumber(input.event.metadata, "interactionCount") ?? 0);
  const audioCompletionRate = Math.max(
    0,
    Math.min(1, readMetadataNumber(input.event.metadata, "completionRate") ?? 0),
  );
  const audioCompleted =
    input.event.type === "audio_complete" ||
    audioCompletionRate >= engagementThresholds.listen.completedCompletionRate;
  const engagementLevel = deriveEngagementLevel({
    pageType: input.event.pageType,
    activeTimeDeltaMs,
    scrollDepth: maxScrollDepth,
    interactionDelta,
    audioCompleted,
    audioCompletionRate,
  });
  const completed =
    engagementLevel === "completed" ||
    input.event.type === "audio_complete" ||
    input.event.type === "media_download";

  await repository.upsertContentEngagement({
    sessionId: input.payload.sessionId,
    visitorHash: input.visitorHash,
    contentType: truncate(input.event.contentType, 80),
    contentId: truncate(input.event.contentId, 120),
    slug: truncate(readMetadataString(input.event.metadata, "slug"), 120),
    path,
    pageType: truncate(input.event.pageType, 80) ?? "static_page",
    observedAt: input.receivedAtServer,
    activeTimeDeltaMs,
    maxScrollDepth,
    scrollMilestones: maxScrollDepth > 0 ? [maxScrollDepth] : [],
    interactionDelta,
    completed,
    engagementLevel,
    exitType: input.event.type === "page_exit" ? "unknown" : undefined,
    eventType: input.event.type,
    sampleRate: normalizeSampleRate(input.event.sampleRate),
  });

  if (isAudioEvent(input.event.type)) {
    await repository.upsertAudioEngagement({
      sessionId: input.payload.sessionId,
      visitorHash: input.visitorHash,
      articleId: truncate(input.event.contentId, 120),
      path,
      observedAt: input.receivedAtServer,
      started: input.event.type === "audio_start",
      completed: audioCompleted,
      listenedMs: readMetadataNumber(input.event.metadata, "listenedMs") ?? 0,
      completionRate: audioCompletionRate,
      seekDelta: input.event.type === "audio_seek" ? 1 : 0,
      replayDelta: input.event.type === "audio_replay" ? 1 : 0,
    });
  }
}

export async function recordTelemetryPayload(
  payload: TelemetryCollectorPayload,
  context: TelemetryRequestContext,
) {
  const receivedAtServer = new Date();
  const visitorHash = buildVisitorHash(context);
  const timingResults = payload.events.map((event, index) =>
    evaluateClientTimingSanity({
      clientSequence: event.clientSequence,
      clientElapsedMs: event.clientElapsedMs,
      previousClientElapsedMs: index > 0 ? payload.events[index - 1]?.clientElapsedMs : null,
    }),
  );
  const botAssessment = resolveLikelyBot({
    userAgent: context.userAgent,
    events: payload.events,
    timingSuspicious: timingResults.some((result) => result.suspicious),
  });

  let previousClientElapsedMs: number | null = null;

  for (const event of payload.events) {
    if (event.path && shouldSkipTelemetryPath(event.path)) {
      previousClientElapsedMs = event.clientElapsedMs;
      continue;
    }

    await recordCollectorEvent({
      payload,
      event,
      context,
      visitorHash,
      receivedAtServer,
      isLikelyBot: botAssessment.isLikelyBot,
      botReasons: botAssessment.reasons,
      previousClientElapsedMs,
    });
    previousClientElapsedMs = event.clientElapsedMs;
  }
}

export async function recordServerError(input: ServerErrorTelemetryInput) {
  return recordError({
    source: "server",
    name: input.name,
    message: input.message,
    digest: input.digest,
    stack: input.stack,
    path: input.path,
    routePath: input.routePath,
    routeType: input.routeType,
    method: input.method,
    statusCode: input.statusCode,
    actionContext: input.actionContext,
    requestId: input.requestId,
    correlationId: input.correlationId,
    release: input.release,
    metadata: input.metadata,
    context: {
      userAgent: input.userAgent,
      method: input.method,
      requestId: input.requestId,
    },
  });
}

export const telemetryService = {
  createErrorFingerprint,
  createErrorSignature,
  engagementThresholdVersion,
  async getEngagementSummary(query: TelemetryEngagementQuery) {
    const repository = await getTelemetryRepository();
    const records = (await repository.listContentEngagementSummaryRecords(
      query,
    )) as ContentEngagementRecord[];

    return toEngagementSummaryDto(records);
  },
  async listContentEngagement(query: ListContentEngagementQuery, pagination: PaginationParams) {
    const repository = await getTelemetryRepository();
    const [records, total] = await Promise.all([
      repository.listContentEngagementRecords(query, pagination),
      repository.countContentEngagementRecords(query),
    ]);

    return {
      items: toTopContentDto(records as ContentEngagementRecord[]),
      total,
    };
  },
  async getContentEngagementDetail(query: ContentEngagementDetailQuery) {
    if (!query.contentId && !query.path) {
      throw new ApiError(400, "VALIDATION_ERROR", "contentId or path is required");
    }

    const repository = await getTelemetryRepository();
    const [records, audio] = await Promise.all([
      repository.listContentEngagementDetailRecords(query),
      repository.getAudioEngagementForContent({
        days: query.days,
        articleId: query.contentId,
        path: query.path,
      }),
    ]);

    return toContentEngagementDetailDto({
      records: records as ContentEngagementRecord[],
      audio,
    });
  },
  deriveDailyVisitorHash,
  fingerprintVersion,
  async getErrorGroupById(id: string) {
    const repository = await getTelemetryRepository();
    const record = (await repository.getErrorGroupById(id)) as ErrorGroupDetailRecord | null;

    if (!record) {
      throw new ApiError(404, "NOT_FOUND", "Observability error group not found");
    }

    return toErrorGroupDetailDto(record);
  },
  async listErrorGroups(query: ListTelemetryErrorsQuery, pagination: PaginationParams) {
    const repository = await getTelemetryRepository();
    const [items, total] = await Promise.all([
      repository.listErrorGroups(query, pagination),
      repository.countErrorGroups(query),
    ]);

    return {
      items: (items as ErrorGroupRecord[]).map(toErrorGroupDto),
      total,
    };
  },
  async updateErrorGroupStatus(
    id: string,
    status: ObservabilityErrorStatus,
    actorId?: string | null,
  ) {
    const repository = await getTelemetryRepository();
    const record = (await repository.updateErrorGroupStatus(
      id,
      status,
      actorId,
    )) as ErrorGroupRecord;
    return toErrorGroupDto(record);
  },
  normalizeTelemetryPath,
  normalizeTelemetryReferrer,
  recordServerError,
  recordTelemetryPayload,
  sanitizeTelemetryMetadata,
  shouldSkipTelemetryPath,
};
