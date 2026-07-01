import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/lib/generated/prisma/client";
import { ApiError } from "@/lib/server/http/api-error";
import {
  assessLikelyBot,
  evaluateClientTimingSanity,
  normalizeSampleRate,
} from "@/lib/server/modules/observability/model";
import { observabilityErrorsService } from "@/lib/server/modules/observability-errors/service";
import {
  performanceMetricPayloadSchema,
  observabilityPerformanceService,
} from "@/lib/server/modules/observability-performance";
import { observabilityMetadataSchema } from "@/lib/server/modules/telemetry/schema";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  TelemetryContentEngagementDetailDto,
  TelemetryEngagementSummaryDto,
  TelemetryTopContentDto,
} from "@/lib/server/modules/telemetry/dto";
import type {
  ContentEngagementDetailQuery,
  ListContentEngagementQuery,
  ObservabilityMetadata,
  TelemetryEngagementQuery,
  TelemetryCollectorEvent,
  TelemetryCollectorPayload,
} from "@/lib/server/modules/telemetry/schema";

const technicalPathPrefixes = ["/_next", "/api", "/cms"] as const;
const technicalPaths = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml"]);
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

async function getAggregatesService() {
  const { observabilityAggregatesService } =
    await import("@/lib/server/modules/observability-aggregates/service");
  return observabilityAggregatesService;
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

function readCountry(value: string | null | undefined) {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue || normalizedValue.length !== 2) {
    return null;
  }

  return normalizedValue;
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
  if (type === "performance_metric") {
    return "PERFORMANCE" as const;
  }

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

    await observabilityErrorsService.recordOccurrence(
      {
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
      },
      input.context,
    );
    return;
  }

  const rawEvent = await repository.recordSessionEvent({
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

  if (input.event.type === "performance_metric") {
    if (!path) {
      return;
    }

    const metric = performanceMetricPayloadSchema.safeParse(input.event.metadata);

    if (!metric.success) {
      return;
    }

    await observabilityPerformanceService.recordMetric({
      sessionId: input.payload.sessionId,
      pageInstanceId: input.payload.pageInstanceId,
      visitorHash: input.visitorHash,
      observabilityEventId: rawEvent.id,
      path,
      pageType: input.event.pageType,
      contentId: input.event.contentId,
      release: input.event.release,
      sampleRate: normalizeSampleRate(input.event.sampleRate),
      occurredAt: input.receivedAtServer,
      metric: metric.data,
      isLikelyBot: input.isLikelyBot,
    });
    return;
  }

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

export const telemetryService = {
  engagementThresholdVersion,
  async getEngagementSummary(query: TelemetryEngagementQuery) {
    const aggregateSummary = await (
      await getAggregatesService()
    ).getTelemetryEngagementSummary(query);
    if (aggregateSummary) return aggregateSummary;

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
  normalizeTelemetryPath,
  normalizeTelemetryReferrer,
  recordTelemetryPayload,
  sanitizeTelemetryMetadata,
  shouldSkipTelemetryPath,
};
