import "server-only";

import { observabilityAggregatesRepository } from "@/lib/server/modules/observability-aggregates/repository";

import type { Prisma } from "@/lib/generated/prisma/client";
import type { ObservabilityAggregationResultDto } from "@/lib/server/modules/observability-aggregates/dto";
import type { ObservabilityAggregatesOverviewDto } from "@/lib/server/modules/observability-aggregates/dto";
import type {
  ObservabilityAggregateDomain,
  ObservabilityAggregateQuery,
  ObservabilityAggregationJobInput,
} from "@/lib/server/modules/observability-aggregates/schema";
import type { ObservabilityAuditSummaryDto } from "@/lib/server/modules/observability-audit/dto";
import type {
  PerformanceSummaryDto,
  PerformanceTrendDto,
  PerformanceWorstPageDto,
} from "@/lib/server/modules/observability-performance/dto";
import type {
  PerformanceMetricName,
  PerformanceQuery,
  PerformanceTrendQuery,
  PerformanceWorstPagesQuery,
} from "@/lib/server/modules/observability-performance/schema";
import type {
  TelemetryEngagementSummaryDto,
  TelemetryTopContentDto,
} from "@/lib/server/modules/telemetry/dto";
import type { TelemetryEngagementQuery } from "@/lib/server/modules/telemetry/schema";

const unknown = "unknown";
const contentThresholdVersion = "content-quality-v1";
const defaultLockMs = 15 * 60 * 1000;
const sensitiveAuditActions = new Set(["publish", "unpublish", "delete", "change_role"]);

type DateWindow = { start: Date; end: Date };
type SampleConfidence = "low" | "medium" | "high";

type QualityScoreInput = {
  completedReads: number;
  qualifiedVisits: number;
  totalVisits: number;
  significantReturns: number;
  averageActiveTimeMs: number;
  expectedActiveTimeMs?: number;
  poorPerformanceSessions: number;
  errorImpactedSessions: number;
  sessions: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function toDateFromKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function safeDimension(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 512) : unknown;
}

function weightedCount(sampleRate: number | null | undefined) {
  if (!sampleRate || sampleRate <= 0 || sampleRate > 1) return 1;
  return 1 / sampleRate;
}

export function buildAggregationWindow(input: ObservabilityAggregationJobInput): DateWindow {
  if (input.from && input.to) {
    return {
      start: startOfUtcDay(new Date(input.from)),
      end: addUtcDays(startOfUtcDay(new Date(input.to)), 1),
    };
  }

  const tomorrow = addUtcDays(startOfUtcDay(new Date()), 1);
  return { start: addUtcDays(tomorrow, -input.days), end: tomorrow };
}

export function sampleConfidence(count: number, averageSampleRate = 1): SampleConfidence {
  if (count < 30 || averageSampleRate < 0.5) return "low";
  if (count < 100 || averageSampleRate < 0.9) return "medium";
  return "high";
}

export function percentile(values: number[], percentileValue: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[clamp(index, 0, sorted.length - 1)] ?? null;
}

export function calculateContentQualityScore(input: QualityScoreInput) {
  const completionRate = input.qualifiedVisits ? input.completedReads / input.qualifiedVisits : 0;
  const qualifiedRatio = input.totalVisits ? input.qualifiedVisits / input.totalVisits : 0;
  const returnRate = input.qualifiedVisits ? input.significantReturns / input.qualifiedVisits : 0;
  const activeTimeFit = clamp(
    input.averageActiveTimeMs / (input.expectedActiveTimeMs ?? 60_000),
    0,
    1,
  );
  const perfPenalty = input.sessions ? input.poorPerformanceSessions / input.sessions : 0;
  const errorPenalty = input.sessions ? input.errorImpactedSessions / input.sessions : 0;
  const weighted =
    0.35 * completionRate +
    0.2 * qualifiedRatio +
    0.15 * returnRate +
    0.15 * activeTimeFit -
    0.1 * perfPenalty -
    0.05 * errorPenalty;

  return {
    score: Math.round(clamp(100 * weighted, 0, 100)),
    components: {
      completionRate,
      qualifiedRatio,
      returnRate,
      activeTimeFit,
      perfPenalty,
      errorPenalty,
      weights: {
        completionRate: 0.35,
        qualifiedRatio: 0.2,
        returnRate: 0.15,
        activeTimeFit: 0.15,
        perfPenalty: -0.1,
        errorPenalty: -0.05,
      },
      thresholdVersion: contentThresholdVersion,
    },
  };
}

function normalizeDomains(domains: ObservabilityAggregateDomain[]) {
  return domains.includes("all")
    ? (["content", "errors", "performance", "audit"] as const)
    : domains;
}

function groupKey(parts: Array<string | number | boolean>) {
  return parts.map(String).join("\u001f");
}

async function buildContentAggregates(window: DateWindow) {
  const [contentRows, audioRows, performanceRows, errorRows] = await Promise.all([
    observabilityAggregatesRepository.listContentSource(window),
    observabilityAggregatesRepository.listAudioSource(window),
    observabilityAggregatesRepository.listPerformanceSource(window),
    observabilityAggregatesRepository.listErrorSource(window),
  ]);
  const audioCompleted = new Set(
    audioRows
      .filter((row) => row.completed)
      .map((row) =>
        groupKey([
          toDateKey(row.firstSeenAt),
          safeDimension(row.articleId),
          row.path,
          row.sessionId ?? unknown,
        ]),
      ),
  );
  const poorPerformanceSessions = new Set(
    performanceRows
      .filter(
        (row) =>
          row.perceivedQuality === "frustrating" ||
          row.perceivedQuality === "broken" ||
          row.causedEarlyExit,
      )
      .map((row) =>
        groupKey([
          toDateKey(row.occurredAt),
          safeDimension(row.contentId),
          row.path,
          row.sessionId ?? unknown,
        ]),
      ),
  );
  const errorImpactedSessions = new Set(
    errorRows
      .filter((row) => row.errorGroup.status !== "IGNORED")
      .map((row) =>
        groupKey([toDateKey(row.occurredAt), row.path ?? unknown, row.sessionId ?? unknown]),
      ),
  );
  const recurringDaysByContent = new Map<string, Set<string>>();

  type Group = {
    date: string;
    pageType: string;
    contentType: string;
    contentId: string;
    path: string;
    totalVisits: number;
    qualifiedVisits: number;
    completedReads: number;
    significantReturns: number;
    activeTimeTotal: number;
    activeTimeWeight: number;
    sampleRateTotal: number;
    sessions: Set<string>;
    poorPerformanceSessions: Set<string>;
    errorImpactedSessions: Set<string>;
  };
  const groups = new Map<string, Group>();

  for (const row of contentRows) {
    const date = toDateKey(row.firstSeenAt);
    const pageType = safeDimension(row.pageType);
    const contentType = safeDimension(row.contentType);
    const contentId = safeDimension(row.contentId);
    const path = safeDimension(row.path);
    const key = groupKey([date, pageType, contentType, contentId, path]);
    const group = groups.get(key) ?? {
      date,
      pageType,
      contentType,
      contentId,
      path,
      totalVisits: 0,
      qualifiedVisits: 0,
      completedReads: 0,
      significantReturns: 0,
      activeTimeTotal: 0,
      activeTimeWeight: 0,
      sampleRateTotal: 0,
      sessions: new Set<string>(),
      poorPerformanceSessions: new Set<string>(),
      errorImpactedSessions: new Set<string>(),
    };
    const weight = weightedCount(row.sampleRate);
    const sessionKey = row.sessionId ?? `${row.path}:${row.firstSeenAt.toISOString()}`;
    const isQualified = row.engagementLevel === "engaged" || row.engagementLevel === "completed";
    const audioKey = groupKey([date, contentId, row.path, row.sessionId ?? unknown]);
    const completed = row.completed || audioCompleted.has(audioKey);

    group.totalVisits += weight;
    group.qualifiedVisits += isQualified ? weight : 0;
    group.completedReads += completed ? weight : 0;
    group.significantReturns += Math.max(0, row.returnCountInSession) * weight;
    group.activeTimeTotal += row.activeTimeMs * weight;
    group.activeTimeWeight += weight;
    group.sampleRateTotal += row.sampleRate ?? 1;
    group.sessions.add(sessionKey);
    if (
      poorPerformanceSessions.has(groupKey([date, contentId, row.path, row.sessionId ?? unknown]))
    ) {
      group.poorPerformanceSessions.add(sessionKey);
    }
    if (errorImpactedSessions.has(groupKey([date, row.path, row.sessionId ?? unknown]))) {
      group.errorImpactedSessions.add(sessionKey);
    }
    if (isQualified) {
      const recurringKey = groupKey([contentType, contentId, path]);
      recurringDaysByContent.set(
        recurringKey,
        recurringDaysByContent.get(recurringKey) ?? new Set(),
      );
      recurringDaysByContent.get(recurringKey)?.add(date);
    }
    groups.set(key, group);
  }

  return Array.from(groups.values()).map<Prisma.DailyContentQualityAggregateCreateManyInput>(
    (group) => {
      const averageActiveTimeMs = group.activeTimeWeight
        ? Math.round(group.activeTimeTotal / group.activeTimeWeight)
        : 0;
      const score = calculateContentQualityScore({
        completedReads: group.completedReads,
        qualifiedVisits: group.qualifiedVisits,
        totalVisits: group.totalVisits,
        significantReturns: group.significantReturns,
        averageActiveTimeMs,
        poorPerformanceSessions: group.poorPerformanceSessions.size,
        errorImpactedSessions: group.errorImpactedSessions.size,
        sessions: group.sessions.size,
      });
      const recurringKey = groupKey([group.contentType, group.contentId, group.path]);
      const averageSampleRate = group.totalVisits ? group.sampleRateTotal / group.totalVisits : 1;

      return {
        date: toDateFromKey(group.date),
        pageType: group.pageType,
        contentType: group.contentType,
        contentId: group.contentId,
        path: group.path,
        totalVisits: group.totalVisits,
        qualifiedVisits: group.qualifiedVisits,
        completedReads: group.completedReads,
        significantReturns: group.significantReturns,
        recurringContentDays: recurringDaysByContent.get(recurringKey)?.size ?? 0,
        averageActiveTimeMs,
        frustrationSignals: group.poorPerformanceSessions.size + group.errorImpactedSessions.size,
        errorImpactedSessions: group.errorImpactedSessions.size,
        poorPerformanceSessions: group.poorPerformanceSessions.size,
        qualityScore: score.score,
        qualityScoreComponents: score.components,
        sampleConfidence: sampleConfidence(group.totalVisits, averageSampleRate),
        thresholdVersion: contentThresholdVersion,
      };
    },
  );
}

async function buildPerformanceAggregates(window: DateWindow) {
  const rows = await observabilityAggregatesRepository.listPerformanceSource(window);
  type Group = {
    date: string;
    pageType: string;
    path: string;
    contentId: string;
    deviceType: string;
    release: string;
    rows: typeof rows;
  };
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const date = toDateKey(row.occurredAt);
    const group = {
      date,
      pageType: safeDimension(row.pageType),
      path: safeDimension(row.path),
      contentId: safeDimension(row.contentId),
      deviceType: safeDimension(row.deviceType),
      release: safeDimension(row.release),
    };
    const key = groupKey(Object.values(group));
    const existing = groups.get(key) ?? { ...group, rows: [] };
    existing.rows.push(row);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).map<Prisma.DailyPerformanceAggregateCreateManyInput>(
    (group) => {
      const poor = group.rows.filter((row) => row.rating === "poor").length;
      const avgSampleRate =
        group.rows.reduce((sum, row) => sum + (row.sampleRate ?? 1), 0) / group.rows.length;
      return {
        date: toDateFromKey(group.date),
        pageType: group.pageType,
        path: group.path,
        contentId: group.contentId,
        deviceType: group.deviceType,
        release: group.release,
        totalExperiences: group.rows.length,
        smoothCount: group.rows.filter((row) => row.perceivedQuality === "smooth").length,
        acceptableCount: group.rows.filter((row) => row.perceivedQuality === "acceptable").length,
        frustratingCount: group.rows.filter((row) => row.perceivedQuality === "frustrating").length,
        brokenCount: group.rows.filter((row) => row.perceivedQuality === "broken").length,
        earlyExitCount: group.rows.filter((row) => row.causedEarlyExit).length,
        lcpP75: percentile(
          group.rows.flatMap((row) => (row.lcp === null ? [] : [row.lcp])),
          75,
        ),
        inpP75: percentile(
          group.rows.flatMap((row) => (row.inp === null ? [] : [row.inp])),
          75,
        ),
        clsP75: percentile(
          group.rows.flatMap((row) => (row.cls === null ? [] : [row.cls])),
          75,
        ),
        fcpP75: percentile(
          group.rows.flatMap((row) => (row.fcp === null ? [] : [row.fcp])),
          75,
        ),
        ttfbP75: percentile(
          group.rows.flatMap((row) => (row.ttfb === null ? [] : [row.ttfb])),
          75,
        ),
        poorRate: group.rows.length ? poor / group.rows.length : 0,
        sampleConfidence: sampleConfidence(group.rows.length, avgSampleRate),
        thresholdVersion: group.rows[0]?.thresholdVersion ?? "performance-v1",
      };
    },
  );
}

async function buildErrorAggregates(window: DateWindow) {
  const rows = await observabilityAggregatesRepository.listErrorSource(window);
  type Group = {
    date: string;
    source: string;
    severity: string;
    status: string;
    impactArea: string;
    userImpact: string;
    release: string;
    rows: typeof rows;
    sessions: Set<string>;
    groups: Set<string>;
  };
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const date = toDateKey(row.occurredAt);
    const data = {
      date,
      source: row.errorGroup.source.toLowerCase(),
      severity: row.errorGroup.severity.toLowerCase(),
      status: row.errorGroup.status.toLowerCase(),
      impactArea: row.errorGroup.impactArea.toLowerCase(),
      userImpact: row.errorGroup.userImpact.toLowerCase(),
      release: safeDimension(row.errorGroup.lastRelease),
    };
    const key = groupKey(Object.values(data));
    const existing = groups.get(key) ?? {
      ...data,
      rows: [],
      sessions: new Set(),
      groups: new Set(),
    };
    existing.rows.push(row);
    existing.groups.add(row.errorGroup.id);
    if (row.sessionId) existing.sessions.add(row.sessionId);
    groups.set(key, existing);
  }
  return Array.from(groups.values()).map<Prisma.DailyErrorAggregateCreateManyInput>((group) => ({
    date: toDateFromKey(group.date),
    source: group.source,
    severity: group.severity,
    status: group.status,
    impactArea: group.impactArea,
    userImpact: group.userImpact,
    release: group.release,
    newGroups: new Set(
      group.rows
        .filter((row) => toDateKey(row.errorGroup.firstSeenAt) === group.date)
        .map((row) => row.errorGroup.id),
    ).size,
    openGroups: group.status === "open" || group.status === "investigating" ? group.groups.size : 0,
    criticalHighGroups:
      group.severity === "critical" || group.severity === "high" ? group.groups.size : 0,
    regressions: new Set(
      group.rows.filter((row) => row.errorGroup.regression).map((row) => row.errorGroup.id),
    ).size,
    occurrences: group.rows.length,
    affectedSessions: group.sessions.size,
    blockedActionGroups:
      group.userImpact === "blocked_action" || group.userImpact === "lost_content"
        ? group.groups.size
        : 0,
    priorityScoreAverage: group.rows.length
      ? group.rows.reduce((sum, row) => sum + row.errorGroup.priorityScore, 0) / group.rows.length
      : 0,
  }));
}

async function buildAuditAggregates(window: DateWindow) {
  const rows = await observabilityAggregatesRepository.listAuditSource(window);
  type Group = {
    date: string;
    resourceType: string;
    action: string;
    outcome: string;
    riskLevel: string;
    publicImpact: boolean;
    rows: typeof rows;
    actors: Set<string>;
  };
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const data = {
      date: toDateKey(row.createdAt),
      resourceType: safeDimension(row.resourceType),
      action: safeDimension(row.action),
      outcome: row.outcome.toLowerCase(),
      riskLevel: row.riskLevel.toLowerCase(),
      publicImpact: row.publicImpact,
    };
    const key = groupKey(Object.values(data));
    const existing = groups.get(key) ?? { ...data, rows: [], actors: new Set() };
    existing.rows.push(row);
    if (row.actorId) existing.actors.add(row.actorId);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).map<Prisma.DailyAuditAggregateCreateManyInput>((group) => ({
    date: toDateFromKey(group.date),
    resourceType: group.resourceType,
    action: group.action,
    outcome: group.outcome,
    riskLevel: group.riskLevel,
    publicImpact: group.publicImpact,
    activityCount: group.rows.length,
    highCriticalCount:
      group.riskLevel === "high" || group.riskLevel === "critical" ? group.rows.length : 0,
    failureCount: group.outcome === "failure" ? group.rows.length : 0,
    sensitiveActionCount: sensitiveAuditActions.has(group.action) ? group.rows.length : 0,
    activeActorCount: group.actors.size,
  }));
}

async function runDomain(
  domain: ObservabilityAggregateDomain,
  window: DateWindow,
  dryRun: boolean,
) {
  if (domain === "content") {
    const rows = await buildContentAggregates(window);
    return dryRun
      ? rows.length
      : observabilityAggregatesRepository.replaceContentAggregates(window, rows);
  }
  if (domain === "performance") {
    const rows = await buildPerformanceAggregates(window);
    return dryRun
      ? rows.length
      : observabilityAggregatesRepository.replacePerformanceAggregates(window, rows);
  }
  if (domain === "errors") {
    const rows = await buildErrorAggregates(window);
    return dryRun
      ? rows.length
      : observabilityAggregatesRepository.replaceErrorAggregates(window, rows);
  }
  if (domain === "audit") {
    const rows = await buildAuditAggregates(window);
    return dryRun
      ? rows.length
      : observabilityAggregatesRepository.replaceAuditAggregates(window, rows);
  }
  return 0;
}

function daysAgo(days: number) {
  return addUtcDays(startOfUtcDay(new Date()), -days);
}

function metricUnit(metric: PerformanceMetricName) {
  return metric === "cls" ? "unitless" : "ms";
}

function metricThreshold(metric: PerformanceMetricName) {
  const thresholds = {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    ttfb: { good: 800, poor: 1800 },
  } as const;
  return thresholds[metric];
}

function rateMetric(metric: PerformanceMetricName, value: number | null) {
  if (value === null) return "good" as const;
  const threshold = metricThreshold(metric);
  if (value <= threshold.good) return "good" as const;
  if (value <= threshold.poor) return "needs_improvement" as const;
  return "poor" as const;
}

function toCompletionRate(completed: number, qualified: number) {
  return qualified ? completed / qualified : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function readPositiveIntEnv(name: string) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export const observabilityAggregatesService = {
  async aggregate(
    input: ObservabilityAggregationJobInput,
  ): Promise<ObservabilityAggregationResultDto> {
    const window = buildAggregationWindow(input);
    const domains = normalizeDomains(input.domains);
    const domainForLock = input.domains.includes("all") ? "all" : domains[0];
    const lock = input.dryRun
      ? null
      : await observabilityAggregatesRepository.acquireJobRun({
          jobName: "observability:aggregate",
          domain: domainForLock,
          window,
          lockMs: readPositiveIntEnv("OBSERVABILITY_JOB_LOCK_MS") ?? defaultLockMs,
          metadata: { domains },
        });

    if (!input.dryRun && !lock) {
      return {
        jobRunId: null,
        domains: [...domains],
        windowStart: window.start.toISOString(),
        windowEnd: window.end.toISOString(),
        dryRun: false,
        processedRows: 0,
      };
    }

    try {
      let processedRows = 0;
      for (const domain of domains) processedRows += await runDomain(domain, window, input.dryRun);
      if (lock)
        await observabilityAggregatesRepository.finishJobRun(lock.id, {
          processedRows,
          metadata: { domains },
        });
      return {
        jobRunId: lock?.id ?? null,
        domains: [...domains],
        windowStart: window.start.toISOString(),
        windowEnd: window.end.toISOString(),
        dryRun: input.dryRun,
        processedRows,
      };
    } catch (error) {
      if (lock) await observabilityAggregatesRepository.failJobRun(lock.id, error);
      throw error;
    }
  },

  async prune() {
    return observabilityAggregatesRepository.prune({
      raw: readPositiveIntEnv("OBSERVABILITY_RAW_RETENTION_DAYS")
        ? daysAgo(readPositiveIntEnv("OBSERVABILITY_RAW_RETENTION_DAYS") ?? 1)
        : undefined,
      interpreted: readPositiveIntEnv("OBSERVABILITY_INTERPRETED_RETENTION_DAYS")
        ? daysAgo(readPositiveIntEnv("OBSERVABILITY_INTERPRETED_RETENTION_DAYS") ?? 1)
        : undefined,
      errorOccurrences: readPositiveIntEnv("OBSERVABILITY_ERROR_OCCURRENCE_RETENTION_DAYS")
        ? daysAgo(readPositiveIntEnv("OBSERVABILITY_ERROR_OCCURRENCE_RETENTION_DAYS") ?? 1)
        : undefined,
      aggregates: readPositiveIntEnv("OBSERVABILITY_AGGREGATE_RETENTION_DAYS")
        ? daysAgo(readPositiveIntEnv("OBSERVABILITY_AGGREGATE_RETENTION_DAYS") ?? 1)
        : undefined,
    });
  },

  async overview(query: ObservabilityAggregateQuery): Promise<ObservabilityAggregatesOverviewDto> {
    const from = daysAgo(query.days);
    const [content, performance, errors, audit] = await Promise.all([
      observabilityAggregatesRepository.listContentAggregates({
        from,
        pageType: query.pageType,
        contentType: query.contentType,
        contentId: query.contentId,
        path: query.path,
      }),
      observabilityAggregatesRepository.listPerformanceAggregates({
        from,
        pageType: query.pageType,
        deviceType: query.deviceType,
        release: query.release,
        path: query.path,
      }),
      observabilityAggregatesRepository.listErrorAggregates({
        from,
        severity: query.severity,
        status: query.status,
        release: query.release,
      }),
      observabilityAggregatesRepository.listAuditAggregates({
        from,
        riskLevel: query.riskLevel,
        outcome: query.outcome,
      }),
    ]);

    return {
      content: content.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        pageType: row.pageType,
        contentType: row.contentType,
        contentId: row.contentId,
        path: row.path,
        totalVisits: row.totalVisits,
        qualifiedVisits: row.qualifiedVisits,
        completedReads: row.completedReads,
        qualityScore: row.qualityScore,
        qualityScoreComponents: row.qualityScoreComponents,
        sampleConfidence: row.sampleConfidence as "low" | "medium" | "high",
      })),
      performance: performance.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        pageType: row.pageType,
        path: row.path,
        contentId: row.contentId,
        deviceType: row.deviceType,
        release: row.release,
        totalExperiences: row.totalExperiences,
        frustratingCount: row.frustratingCount,
        brokenCount: row.brokenCount,
        poorRate: row.poorRate,
        sampleConfidence: row.sampleConfidence as "low" | "medium" | "high",
      })),
      errors: errors.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        source: row.source,
        severity: row.severity,
        status: row.status,
        impactArea: row.impactArea,
        userImpact: row.userImpact,
        release: row.release,
        newGroups: row.newGroups,
        openGroups: row.openGroups,
        criticalHighGroups: row.criticalHighGroups,
        regressions: row.regressions,
        occurrences: row.occurrences,
        affectedSessions: row.affectedSessions,
        blockedActionGroups: row.blockedActionGroups,
      })),
      audit: audit.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        resourceType: row.resourceType,
        action: row.action,
        outcome: row.outcome,
        riskLevel: row.riskLevel,
        publicImpact: row.publicImpact,
        activityCount: row.activityCount,
        highCriticalCount: row.highCriticalCount,
        failureCount: row.failureCount,
        sensitiveActionCount: row.sensitiveActionCount,
        activeActorCount: row.activeActorCount,
      })),
    };
  },

  async getTelemetryEngagementSummary(
    query: TelemetryEngagementQuery,
  ): Promise<TelemetryEngagementSummaryDto | null> {
    const rows = await observabilityAggregatesRepository.listContentAggregates({
      from: daysAgo(query.days),
      pageType: query.pageType,
      contentType: query.contentType,
    });
    if (!rows.length) return null;

    const qualifiedVisits = Math.round(sum(rows.map((row) => row.qualifiedVisits)));
    const completedReads = Math.round(sum(rows.map((row) => row.completedReads)));
    const totalVisits = Math.round(sum(rows.map((row) => row.totalVisits)));
    const averageActiveTimeMs = qualifiedVisits
      ? Math.round(
          rows.reduce((total, row) => total + row.averageActiveTimeMs * row.qualifiedVisits, 0) /
            qualifiedVisits,
        )
      : 0;
    const topContent: TelemetryTopContentDto[] = rows
      .map((row) => ({
        contentId: row.contentId === unknown ? null : row.contentId,
        slug: null,
        path: row.path,
        pageType: row.pageType as TelemetryTopContentDto["pageType"],
        contentType:
          row.contentType === unknown
            ? null
            : (row.contentType as TelemetryTopContentDto["contentType"]),
        qualifiedVisits: Math.round(row.qualifiedVisits),
        completedReads: Math.round(row.completedReads),
        completionRate: toCompletionRate(row.completedReads, row.qualifiedVisits),
        averageActiveTimeMs: row.averageActiveTimeMs,
        returnCountInSession: Math.round(row.significantReturns),
        refreshCount: 0,
        lastSeenAt: row.date.toISOString(),
      }))
      .sort((first, second) => second.qualifiedVisits - first.qualifiedVisits);

    return {
      qualifiedVisits,
      completedReads,
      completionRate: toCompletionRate(completedReads, qualifiedVisits),
      averageActiveTimeMs,
      engagementBreakdown: [
        { level: "glance", count: Math.max(0, totalVisits - qualifiedVisits) },
        { level: "scan", count: 0 },
        { level: "engaged", count: Math.max(0, qualifiedVisits - completedReads) },
        { level: "completed", count: completedReads },
      ],
      topContent: topContent.slice(0, 10),
      lowQualityContent: topContent
        .filter((item) => item.qualifiedVisits === 0 && item.completedReads === 0)
        .slice(0, 10),
      sampleConfidence: sampleConfidence(totalVisits),
    };
  },

  async getPerformanceSummary(query: PerformanceQuery): Promise<PerformanceSummaryDto | null> {
    const rows = await observabilityAggregatesRepository.listPerformanceAggregates({
      from: daysAgo(query.days),
      pageType: query.pageType,
      deviceType: query.deviceType,
      release: query.release,
    });
    if (!rows.length) return null;

    const totalExperiences = sum(rows.map((row) => row.totalExperiences));
    const earlyExitCount = sum(rows.map((row) => row.earlyExitCount));
    const frustratingCount = sum(rows.map((row) => row.frustratingCount));
    const brokenCount = sum(rows.map((row) => row.brokenCount));

    return {
      totalExperiences,
      frustratingRate: totalExperiences ? (frustratingCount + brokenCount) / totalExperiences : 0,
      earlyExitCount,
      sampleConfidence: sampleConfidence(totalExperiences),
      qualityBreakdown: [
        { quality: "smooth", count: sum(rows.map((row) => row.smoothCount)) },
        { quality: "acceptable", count: sum(rows.map((row) => row.acceptableCount)) },
        { quality: "frustrating", count: frustratingCount },
        { quality: "broken", count: brokenCount },
      ],
      vitals: (["lcp", "inp", "cls", "fcp", "ttfb"] as const).map((metric) => {
        const values = rows.flatMap((row) => {
          const value = row[`${metric}P75` as const];
          return value === null ? [] : [value];
        });
        const p75 = percentile(values, 75);
        const threshold = metricThreshold(metric);
        return {
          metric,
          p75,
          rating: rateMetric(metric, p75),
          unit: metricUnit(metric),
          goodThreshold: threshold.good,
          poorThreshold: threshold.poor,
          sampleCount: totalExperiences,
        };
      }),
    };
  },

  async listPerformanceWorstPages(
    query: PerformanceWorstPagesQuery,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: PerformanceWorstPageDto[]; total: number } | null> {
    const rows = await observabilityAggregatesRepository.listPerformanceAggregates({
      from: daysAgo(query.days),
      pageType: query.pageType,
      deviceType: query.deviceType,
      release: query.release,
    });
    if (!rows.length) return null;
    const filteredRows = query.q
      ? rows.filter(
          (row) => row.path.includes(query.q ?? "") || row.contentId.includes(query.q ?? ""),
        )
      : rows;
    const items = filteredRows
      .map<PerformanceWorstPageDto>((row) => ({
        path: row.path,
        pageType: row.pageType,
        contentId: row.contentId === unknown ? null : row.contentId,
        sampleCount: row.totalExperiences,
        affectedSessions: row.totalExperiences,
        frustratingCount: row.frustratingCount + row.brokenCount,
        frustratingRate: row.totalExperiences
          ? (row.frustratingCount + row.brokenCount) / row.totalExperiences
          : 0,
        earlyExitCount: row.earlyExitCount,
        earlyExitRate: row.totalExperiences ? row.earlyExitCount / row.totalExperiences : 0,
        dominantDevice: row.deviceType === unknown ? null : row.deviceType,
        release: row.release === unknown ? null : row.release,
        sampleConfidence: row.sampleConfidence as "low" | "medium" | "high",
        impactScore:
          (row.frustratingCount + row.brokenCount) * 10 +
          row.earlyExitCount * 5 +
          row.totalExperiences,
        qualityReasons: [],
        qualityBreakdown: [
          { quality: "smooth", count: row.smoothCount },
          { quality: "acceptable", count: row.acceptableCount },
          { quality: "frustrating", count: row.frustratingCount },
          { quality: "broken", count: row.brokenCount },
        ],
        vitals: (["lcp", "inp", "cls", "fcp", "ttfb"] as const).map((metric) => {
          const p75 = row[`${metric}P75` as const];
          const threshold = metricThreshold(metric);
          return {
            metric,
            p75,
            rating: rateMetric(metric, p75),
            unit: metricUnit(metric),
            goodThreshold: threshold.good,
            poorThreshold: threshold.poor,
            sampleCount: row.totalExperiences,
          };
        }),
      }))
      .sort((first, second) => second.impactScore - first.impactScore);
    const start = (pagination.page - 1) * pagination.pageSize;
    return { items: items.slice(start, start + pagination.pageSize), total: items.length };
  },

  async getPerformanceTrend(query: PerformanceTrendQuery): Promise<PerformanceTrendDto | null> {
    const rows = await observabilityAggregatesRepository.listPerformanceAggregates({
      from: daysAgo(query.days),
      pageType: query.pageType,
      deviceType: query.deviceType,
      release: query.release,
    });
    if (!rows.length) return null;
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.date.toISOString().slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return {
      metric: query.metric,
      unit: metricUnit(query.metric),
      points: Array.from(grouped.entries())
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([date, groupRows]) => {
          const values = groupRows.flatMap((row) => {
            const value = row[`${query.metric}P75` as const];
            return value === null ? [] : [value];
          });
          const p75 = percentile(values, 75);
          return {
            date,
            p75,
            sampleCount: sum(groupRows.map((row) => row.totalExperiences)),
            rating: rateMetric(query.metric, p75),
          };
        }),
    };
  },

  async getAuditSummary(): Promise<ObservabilityAuditSummaryDto | null> {
    const rows = await observabilityAggregatesRepository.listAuditAggregates({ from: daysAgo(7) });
    if (!rows.length) return null;
    return {
      highRiskCount: sum(rows.map((row) => row.highCriticalCount)),
      publicImpactCount: sum(
        rows.filter((row) => row.publicImpact).map((row) => row.activityCount),
      ),
      failureCount: sum(rows.map((row) => row.failureCount)),
      activeActorCount: sum(rows.map((row) => row.activeActorCount)),
      sensitiveActionCount: sum(rows.map((row) => row.sensitiveActionCount)),
    };
  },
};
