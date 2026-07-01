import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import type {
  PerformanceDetailQuery,
  PerformanceMetricName,
  PerformanceQuery,
  PerformanceWorstPagesQuery,
} from "@/lib/server/modules/observability-performance/schema";

const PERFORMANCE_SELECT = {
  id: true,
  sessionId: true,
  visitorHash: true,
  observabilityEventId: true,
  pageInstanceId: true,
  path: true,
  routePath: true,
  pageType: true,
  contentId: true,
  deviceType: true,
  browser: true,
  os: true,
  connectionType: true,
  effectiveConnectionType: true,
  saveData: true,
  viewportWidth: true,
  viewportHeight: true,
  lcp: true,
  inp: true,
  cls: true,
  fcp: true,
  ttfb: true,
  rating: true,
  perceivedQuality: true,
  causedEarlyExit: true,
  activeTimeMs: true,
  exitType: true,
  hasBlockingError: true,
  correlatedErrorCount: true,
  qualityReasons: true,
  release: true,
  thresholdVersion: true,
  sampleRate: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.PerformanceExperienceSelect;

export type PerformanceExperienceRecord = Prisma.PerformanceExperienceGetPayload<{
  select: typeof PERFORMANCE_SELECT;
}>;

export type RecordPerformanceExperienceEntry = {
  sessionId?: string | null;
  visitorHash?: string | null;
  observabilityEventId?: string | null;
  pageInstanceId?: string | null;
  path: string;
  routePath?: string | null;
  pageType: string;
  contentId?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  connectionType?: string | null;
  effectiveConnectionType?: string | null;
  saveData?: boolean | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  metric: PerformanceMetricName;
  value: number;
  rating: string;
  perceivedQuality: string;
  causedEarlyExit: boolean;
  activeTimeMs?: number | null;
  exitType?: string | null;
  hasBlockingError: boolean;
  correlatedErrorCount: number;
  qualityReasons: string[];
  release?: string | null;
  thresholdVersion: string;
  sampleRate: number;
  occurredAt: Date;
};

function getPeriodStart(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function toWhereInput(
  query: PerformanceQuery | PerformanceWorstPagesQuery | PerformanceDetailQuery,
): Prisma.PerformanceExperienceWhereInput {
  return {
    occurredAt: { gte: getPeriodStart(query.days) },
    pageType: query.pageType,
    deviceType: query.deviceType,
    perceivedQuality: query.perceivedQuality,
    release: query.release,
    session: { is: { isLikelyBot: false } },
    path: "path" in query ? query.path : undefined,
    OR:
      "q" in query && query.q
        ? [
            { path: { contains: query.q, mode: "insensitive" } },
            { contentId: { contains: query.q, mode: "insensitive" } },
          ]
        : undefined,
  };
}

function metricUpdate(metric: PerformanceMetricName, value: number) {
  return { [metric]: value } as Pick<Prisma.PerformanceExperienceCreateInput, typeof metric>;
}

function readMetricValue(record: PerformanceExperienceRecord, metric: PerformanceMetricName) {
  const value = record[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rateMetric(metric: PerformanceMetricName, value: number) {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
  } as const;
  const threshold = thresholds[metric];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs_improvement";
  return "poor";
}

function ratingRank(value: string) {
  if (value === "poor") return 3;
  if (value === "needs_improvement") return 2;
  return 1;
}

function deriveMergedRating(
  record: PerformanceExperienceRecord,
  metric: PerformanceMetricName,
  value: number,
) {
  const ratings = (["lcp", "inp", "cls", "fcp", "ttfb"] as const).flatMap((name) => {
    const metricValue = name === metric ? value : readMetricValue(record, name);
    return metricValue === null ? [] : [rateMetric(name, metricValue)];
  });

  return ratings.reduce(
    (current, next) => (ratingRank(next) > ratingRank(current) ? next : current),
    "good",
  );
}

export const observabilityPerformanceRepository = {
  async upsertExperience(entry: RecordPerformanceExperienceEntry) {
    const existing = entry.pageInstanceId
      ? await prisma.performanceExperience.findFirst({
          where: {
            sessionId: entry.sessionId ?? null,
            pageInstanceId: entry.pageInstanceId,
            path: entry.path,
          },
          select: PERFORMANCE_SELECT,
        })
      : null;

    if (!existing) {
      return prisma.performanceExperience.create({
        data: {
          sessionId: entry.sessionId ?? null,
          visitorHash: entry.visitorHash ?? null,
          observabilityEventId: entry.observabilityEventId ?? null,
          pageInstanceId: entry.pageInstanceId ?? null,
          path: entry.path,
          routePath: entry.routePath ?? null,
          pageType: entry.pageType,
          contentId: entry.contentId ?? null,
          deviceType: entry.deviceType ?? null,
          browser: entry.browser ?? null,
          os: entry.os ?? null,
          connectionType: entry.connectionType ?? null,
          effectiveConnectionType: entry.effectiveConnectionType ?? null,
          saveData: entry.saveData ?? null,
          viewportWidth: entry.viewportWidth ?? null,
          viewportHeight: entry.viewportHeight ?? null,
          ...metricUpdate(entry.metric, entry.value),
          rating: entry.rating,
          perceivedQuality: entry.perceivedQuality,
          causedEarlyExit: entry.causedEarlyExit,
          activeTimeMs: entry.activeTimeMs ?? null,
          exitType: entry.exitType ?? null,
          hasBlockingError: entry.hasBlockingError,
          correlatedErrorCount: entry.correlatedErrorCount,
          qualityReasons: entry.qualityReasons,
          release: entry.release ?? null,
          thresholdVersion: entry.thresholdVersion,
          sampleRate: entry.sampleRate,
          occurredAt: entry.occurredAt,
        },
        select: PERFORMANCE_SELECT,
      });
    }

    const rating = deriveMergedRating(existing, entry.metric, entry.value);

    return prisma.performanceExperience.update({
      where: { id: existing.id },
      data: {
        observabilityEventId: entry.observabilityEventId ?? existing.observabilityEventId,
        routePath: entry.routePath ?? existing.routePath,
        contentId: entry.contentId ?? existing.contentId,
        deviceType: entry.deviceType ?? existing.deviceType,
        browser: entry.browser ?? existing.browser,
        os: entry.os ?? existing.os,
        connectionType: entry.connectionType ?? existing.connectionType,
        effectiveConnectionType: entry.effectiveConnectionType ?? existing.effectiveConnectionType,
        saveData: entry.saveData ?? existing.saveData,
        viewportWidth: entry.viewportWidth ?? existing.viewportWidth,
        viewportHeight: entry.viewportHeight ?? existing.viewportHeight,
        ...metricUpdate(entry.metric, entry.value),
        rating,
        perceivedQuality: entry.perceivedQuality,
        causedEarlyExit: existing.causedEarlyExit || entry.causedEarlyExit,
        activeTimeMs: Math.max(existing.activeTimeMs ?? 0, entry.activeTimeMs ?? 0) || null,
        exitType: entry.exitType ?? existing.exitType,
        hasBlockingError: existing.hasBlockingError || entry.hasBlockingError,
        correlatedErrorCount: Math.max(existing.correlatedErrorCount, entry.correlatedErrorCount),
        qualityReasons: Array.from(
          new Set([
            ...(Array.isArray(existing.qualityReasons)
              ? existing.qualityReasons.filter(
                  (value): value is string => typeof value === "string",
                )
              : []),
            ...entry.qualityReasons,
          ]),
        ),
        release: entry.release ?? null,
        thresholdVersion: entry.thresholdVersion,
        sampleRate: entry.sampleRate,
        occurredAt: entry.occurredAt,
      },
      select: PERFORMANCE_SELECT,
    });
  },

  async findRelatedEngagement(input: {
    sessionId?: string | null;
    path: string;
    contentId?: string | null;
  }) {
    return prisma.contentEngagement.findFirst({
      where: {
        sessionId: input.sessionId ?? null,
        path: input.path,
        contentId: input.contentId ?? null,
      },
      select: {
        activeTimeMs: true,
        completed: true,
        engagementLevel: true,
        exitType: true,
      },
      orderBy: { lastSeenAt: "desc" },
    });
  },

  async countBlockingErrors(input: { sessionId?: string | null; path: string }) {
    if (!input.sessionId) return 0;

    return prisma.errorOccurrence.count({
      where: {
        sessionId: input.sessionId,
        path: input.path,
        errorGroup: {
          userImpact: { in: ["BLOCKED_ACTION", "LOST_CONTENT"] },
          status: { not: "IGNORED" },
        },
      },
    });
  },

  async listSummaryRecords(query: PerformanceQuery) {
    return prisma.performanceExperience.findMany({
      where: toWhereInput(query),
      select: PERFORMANCE_SELECT,
      orderBy: { occurredAt: "desc" },
    });
  },

  async listWorstPageRecords(query: PerformanceWorstPagesQuery) {
    return prisma.performanceExperience.findMany({
      where: toWhereInput(query),
      select: PERFORMANCE_SELECT,
      orderBy: { occurredAt: "desc" },
    });
  },

  async countWorstPageRecords(query: PerformanceWorstPagesQuery) {
    return prisma.performanceExperience.count({ where: toWhereInput(query) });
  },

  async listTrendRecords(query: PerformanceQuery) {
    return prisma.performanceExperience.findMany({
      where: toWhereInput(query),
      select: PERFORMANCE_SELECT,
      orderBy: { occurredAt: "asc" },
    });
  },

  async listDetailRecords(query: PerformanceDetailQuery) {
    return prisma.performanceExperience.findMany({
      where: toWhereInput(query),
      select: PERFORMANCE_SELECT,
      orderBy: { occurredAt: "desc" },
    });
  },
};
