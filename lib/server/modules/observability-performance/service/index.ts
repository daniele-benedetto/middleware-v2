import "server-only";

import { ApiError } from "@/lib/server/http/api-error";
import { observabilityPerformanceRepository } from "@/lib/server/modules/observability-performance/repository";

import type { PaginationParams } from "@/lib/server/http/pagination";
import type {
  PerformanceDetailDto,
  PerformanceSummaryDto,
  PerformanceTrendDto,
  PerformanceWorstPageDto,
} from "@/lib/server/modules/observability-performance/dto";
import type { PerformanceExperienceRecord } from "@/lib/server/modules/observability-performance/repository";
import type {
  PerformanceDetailQuery,
  PerformanceMetricName,
  PerformanceMetricPayload,
  PerformanceQuery,
  PerformanceRating,
  PerformanceTrendQuery,
  PerformanceWorstPagesQuery,
  PerceivedQuality,
  SampleConfidence,
} from "@/lib/server/modules/observability-performance/schema";

export const performanceThresholdVersion = "performance-v1";

const metricThresholds = {
  lcp: { good: 2500, poor: 4000, unit: "ms" },
  inp: { good: 200, poor: 500, unit: "ms" },
  cls: { good: 0.1, poor: 0.25, unit: "unitless" },
  fcp: { good: 1800, poor: 3000, unit: "ms" },
  ttfb: { good: 800, poor: 1800, unit: "ms" },
} as const satisfies Record<
  PerformanceMetricName,
  { good: number; poor: number; unit: "ms" | "unitless" }
>;

type RecordPerformanceMetricInput = {
  sessionId: string;
  pageInstanceId?: string | null;
  visitorHash?: string | null;
  observabilityEventId?: string | null;
  path: string;
  pageType?: string | null;
  contentId?: string | null;
  release?: string | null;
  sampleRate: number;
  occurredAt: Date;
  metric: PerformanceMetricPayload;
  isLikelyBot?: boolean;
};

async function getAggregatesService() {
  const { observabilityAggregatesService } =
    await import("@/lib/server/modules/observability-aggregates/service");
  return observabilityAggregatesService;
}

export function ratePerformanceMetric(
  metric: PerformanceMetricName,
  value: number,
): PerformanceRating {
  const threshold = metricThresholds[metric];

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs_improvement";
  return "poor";
}

function ratingRank(value: PerformanceRating) {
  if (value === "poor") return 3;
  if (value === "needs_improvement") return 2;
  return 1;
}

function worstRating(values: PerformanceRating[]) {
  return values.reduce<PerformanceRating>(
    (current, next) => (ratingRank(next) > ratingRank(current) ? next : current),
    "good",
  );
}

function isMetricValueSane(metric: PerformanceMetricName, value: number) {
  if (!Number.isFinite(value) || value < 0) return false;
  if (metric === "cls") return value <= 10;
  return value <= 120_000;
}

function readNumber(record: PerformanceExperienceRecord, metric: PerformanceMetricName) {
  const value = record[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? null;
}

function toSampleConfidence(total: number): SampleConfidence {
  if (total >= 100) return "high";
  if (total >= 30) return "medium";
  return "low";
}

function toSampleConfidenceForRecords(records: PerformanceExperienceRecord[]): SampleConfidence {
  const base = toSampleConfidence(records.length);
  const averageSampleRate = records.length
    ? records.reduce((total, record) => total + record.sampleRate, 0) / records.length
    : 1;

  if (averageSampleRate < 0.5) return "low";
  if (averageSampleRate < 0.9 && base === "high") return "medium";
  return base;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function metricSummary(records: PerformanceExperienceRecord[], metric: PerformanceMetricName) {
  const values = records
    .map((record) => readNumber(record, metric))
    .filter((value) => value !== null);
  const p75 = percentile(values, 75);
  const threshold = metricThresholds[metric];

  return {
    metric,
    p75,
    rating: p75 === null ? "good" : ratePerformanceMetric(metric, p75),
    unit: threshold.unit,
    goodThreshold: threshold.good,
    poorThreshold: threshold.poor,
    sampleCount: values.length,
  };
}

function qualityBreakdown(records: PerformanceExperienceRecord[]) {
  const qualities = ["smooth", "acceptable", "frustrating", "broken"] as const;
  return qualities.map((quality) => ({
    quality,
    count: records.filter((record) => record.perceivedQuality === quality).length,
  }));
}

function toSummaryDto(records: PerformanceExperienceRecord[]): PerformanceSummaryDto {
  const frustratingCount = records.filter(
    (record) => record.perceivedQuality === "frustrating" || record.perceivedQuality === "broken",
  ).length;

  return {
    totalExperiences: records.length,
    frustratingRate: records.length ? frustratingCount / records.length : 0,
    earlyExitCount: records.filter((record) => record.causedEarlyExit).length,
    sampleConfidence: toSampleConfidenceForRecords(records),
    qualityBreakdown: qualityBreakdown(records),
    vitals: (["lcp", "inp", "cls", "fcp", "ttfb"] as const).map((metric) =>
      metricSummary(records, metric),
    ),
  };
}

function dominantValue(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null;
}

function groupByPath(records: PerformanceExperienceRecord[]) {
  const groups = new Map<string, PerformanceExperienceRecord[]>();
  for (const record of records)
    groups.set(record.path, [...(groups.get(record.path) ?? []), record]);
  return Array.from(groups.values());
}

function toWorstPageDto(records: PerformanceExperienceRecord[]): PerformanceWorstPageDto {
  const first = records[0];
  const frustratingCount = records.filter(
    (record) => record.perceivedQuality === "frustrating" || record.perceivedQuality === "broken",
  ).length;
  const earlyExitCount = records.filter((record) => record.causedEarlyExit).length;
  const impactScore = frustratingCount * 10 + earlyExitCount * 5 + records.length;
  const affectedSessions = new Set(records.map((record) => record.sessionId).filter(Boolean)).size;

  return {
    path: first?.path ?? "/",
    pageType: first?.pageType ?? "static_page",
    contentId: first?.contentId ?? null,
    sampleCount: records.length,
    affectedSessions,
    frustratingCount,
    frustratingRate: records.length ? frustratingCount / records.length : 0,
    earlyExitCount,
    earlyExitRate: records.length ? earlyExitCount / records.length : 0,
    dominantDevice: dominantValue(records.map((record) => record.deviceType)),
    release: dominantValue(records.map((record) => record.release)),
    sampleConfidence: toSampleConfidenceForRecords(records),
    impactScore,
    qualityReasons: uniqueStrings(
      records.flatMap((record) => readStringArray(record.qualityReasons)),
    ).slice(0, 6),
    qualityBreakdown: qualityBreakdown(records),
    vitals: (["lcp", "inp", "cls", "fcp", "ttfb"] as const).map((metric) =>
      metricSummary(records, metric),
    ),
  };
}

function segmentBy(
  records: PerformanceExperienceRecord[],
  selector: (record: PerformanceExperienceRecord) => string | null,
) {
  const groups = new Map<string, PerformanceExperienceRecord[]>();
  for (const record of records) {
    const value = selector(record) ?? "unknown";
    groups.set(value, [...(groups.get(value) ?? []), record]);
  }

  return Array.from(groups.entries())
    .map(([value, groupRecords]) => {
      const frustratingCount = groupRecords.filter(
        (record) =>
          record.perceivedQuality === "frustrating" || record.perceivedQuality === "broken",
      ).length;
      return {
        value,
        count: groupRecords.length,
        frustratingRate: groupRecords.length ? frustratingCount / groupRecords.length : 0,
      };
    })
    .sort((first, second) => second.count - first.count);
}

function toTrendDto(
  records: PerformanceExperienceRecord[],
  metric: PerformanceMetricName,
): PerformanceTrendDto {
  const groups = new Map<string, PerformanceExperienceRecord[]>();
  for (const record of records) {
    const key = toDateKey(record.occurredAt);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return {
    metric,
    unit: metricThresholds[metric].unit,
    points: Array.from(groups.entries())
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([date, groupRecords]) => {
        const summary = metricSummary(groupRecords, metric);
        return {
          date,
          p75: summary.p75,
          sampleCount: summary.sampleCount,
          rating: summary.rating,
        };
      }),
  };
}

function toDetailDto(records: PerformanceExperienceRecord[]): PerformanceDetailDto {
  const first = records[0];

  if (!first) {
    throw new ApiError(404, "NOT_FOUND", "Performance experience not found");
  }

  return {
    path: first.path,
    pageType: first.pageType,
    contentId: first.contentId,
    sampleCount: records.length,
    sampleConfidence: toSampleConfidenceForRecords(records),
    qualityBreakdown: qualityBreakdown(records),
    vitals: (["lcp", "inp", "cls", "fcp", "ttfb"] as const).map((metric) =>
      metricSummary(records, metric),
    ),
    earlyExitCount: records.filter((record) => record.causedEarlyExit).length,
    correlatedErrorCount: records.reduce((total, record) => total + record.correlatedErrorCount, 0),
    releases: Array.from(
      new Set(records.map((record) => record.release).filter((value): value is string => !!value)),
    ),
    timeline: records.slice(0, 20).map((record) => ({
      occurredAt: record.occurredAt.toISOString(),
      sessionId: record.sessionId,
      pageInstanceId: record.pageInstanceId,
      observabilityEventId: record.observabilityEventId,
      rating: record.rating as PerformanceRating,
      perceivedQuality: record.perceivedQuality as PerceivedQuality,
      causedEarlyExit: record.causedEarlyExit,
      qualityReasons: readStringArray(record.qualityReasons),
    })),
    deviceSegments: segmentBy(records, (record) => record.deviceType),
    connectionSegments: segmentBy(
      records,
      (record) => record.effectiveConnectionType ?? record.connectionType,
    ),
    qualityReasons: uniqueStrings(
      records.flatMap((record) => readStringArray(record.qualityReasons)),
    ),
  };
}

export function derivePerceivedQuality(input: {
  rating: PerformanceRating;
  metric: PerformanceMetricName;
  causedEarlyExit: boolean;
  hasBlockingError?: boolean;
}): PerceivedQuality {
  if (input.hasBlockingError && input.rating === "poor") return "broken";
  if (input.causedEarlyExit && input.rating !== "good") return "frustrating";
  if (
    input.rating === "poor" &&
    (input.metric === "lcp" || input.metric === "inp" || input.metric === "cls")
  ) {
    return "frustrating";
  }
  if (input.rating === "needs_improvement") return "acceptable";
  return "smooth";
}

function causedEarlyExitFromMetadata(metric: PerformanceMetricPayload, rating: PerformanceRating) {
  if (rating === "good") return false;
  return metric.exitType === "bounce" || (metric.activeTimeMs ?? Number.POSITIVE_INFINITY) < 5000;
}

function deriveQualityReasons(input: {
  metric: PerformanceMetricName;
  rating: PerformanceRating;
  causedEarlyExit: boolean;
  hasBlockingError: boolean;
  engagement?: {
    activeTimeMs: number;
    completed: boolean;
    engagementLevel: string;
    exitType: string;
  } | null;
}) {
  const reasons: string[] = [];

  if (input.rating === "poor") reasons.push(`${input.metric}_poor`);
  if (input.rating === "needs_improvement") reasons.push(`${input.metric}_needs_improvement`);
  if (input.causedEarlyExit) reasons.push("early_exit_after_poor_performance");
  if (input.hasBlockingError) reasons.push("blocking_error_correlated");
  if (input.engagement?.exitType === "bounce") reasons.push("engagement_bounce");
  if (
    input.engagement &&
    !input.engagement.completed &&
    input.engagement.engagementLevel === "glance"
  ) {
    reasons.push("no_qualified_engagement");
  }

  return uniqueStrings(reasons);
}

export const observabilityPerformanceService = {
  thresholdVersion: performanceThresholdVersion,
  metricThresholds,
  async recordMetric(input: RecordPerformanceMetricInput) {
    if (input.isLikelyBot || !isMetricValueSane(input.metric.metric, input.metric.value)) {
      return null;
    }

    const rating = ratePerformanceMetric(input.metric.metric, input.metric.value);
    const [engagement, correlatedErrorCount] = await Promise.all([
      observabilityPerformanceRepository.findRelatedEngagement({
        sessionId: input.sessionId,
        path: input.path,
        contentId: input.contentId,
      }),
      observabilityPerformanceRepository.countBlockingErrors({
        sessionId: input.sessionId,
        path: input.path,
      }),
    ]);
    const engagementEarlyExit =
      rating !== "good" &&
      !!engagement &&
      (engagement.exitType === "bounce" ||
        (engagement.activeTimeMs < 5000 && engagement.engagementLevel === "glance"));
    const causedEarlyExit =
      causedEarlyExitFromMetadata(input.metric, rating) || engagementEarlyExit;
    const hasBlockingError = correlatedErrorCount > 0;
    const perceivedQuality = derivePerceivedQuality({
      rating,
      metric: input.metric.metric,
      causedEarlyExit,
      hasBlockingError,
    });
    const qualityReasons = deriveQualityReasons({
      metric: input.metric.metric,
      rating,
      causedEarlyExit,
      hasBlockingError,
      engagement,
    });

    return observabilityPerformanceRepository.upsertExperience({
      sessionId: input.sessionId,
      pageInstanceId: input.pageInstanceId,
      visitorHash: input.visitorHash,
      observabilityEventId: input.observabilityEventId,
      path: input.path,
      routePath: input.metric.routePath,
      pageType: input.pageType ?? "static_page",
      contentId: input.contentId,
      deviceType: input.metric.deviceType,
      browser: input.metric.browser,
      os: input.metric.os,
      connectionType: input.metric.connectionType,
      effectiveConnectionType: input.metric.effectiveConnectionType,
      saveData: input.metric.saveData,
      viewportWidth: input.metric.viewportWidth,
      viewportHeight: input.metric.viewportHeight,
      metric: input.metric.metric,
      value: input.metric.value,
      rating,
      perceivedQuality,
      causedEarlyExit,
      activeTimeMs: input.metric.activeTimeMs ?? engagement?.activeTimeMs ?? null,
      exitType: input.metric.exitType ?? engagement?.exitType ?? null,
      hasBlockingError,
      correlatedErrorCount,
      qualityReasons,
      release: input.release,
      thresholdVersion: performanceThresholdVersion,
      sampleRate: input.sampleRate,
      occurredAt: input.occurredAt,
    });
  },
  async getSummary(query: PerformanceQuery) {
    const aggregateSummary = await (await getAggregatesService()).getPerformanceSummary(query);
    if (aggregateSummary) return aggregateSummary;

    return toSummaryDto(await observabilityPerformanceRepository.listSummaryRecords(query));
  },
  async listWorstPages(query: PerformanceWorstPagesQuery, pagination: PaginationParams) {
    const aggregateResult = await (
      await getAggregatesService()
    ).listPerformanceWorstPages(query, pagination);
    if (aggregateResult) return aggregateResult;

    const records = await observabilityPerformanceRepository.listWorstPageRecords(query);
    const sorted = groupByPath(records)
      .map(toWorstPageDto)
      .sort((first, second) => {
        const direction = query.sortOrder === "asc" ? 1 : -1;
        const sortValue =
          query.sortBy === "frustratingRate"
            ? first.frustratingRate - second.frustratingRate
            : query.sortBy === "sampleCount"
              ? first.sampleCount - second.sampleCount
              : query.sortBy === "lastSeenAt"
                ? first.path.localeCompare(second.path)
                : first.impactScore - second.impactScore;
        return sortValue * direction;
      });

    const start = (pagination.page - 1) * pagination.pageSize;
    return {
      items: sorted.slice(start, start + pagination.pageSize),
      total: sorted.length,
    };
  },
  async getTrend(query: PerformanceTrendQuery) {
    const aggregateTrend = await (await getAggregatesService()).getPerformanceTrend(query);
    if (aggregateTrend) return aggregateTrend;

    return toTrendDto(
      await observabilityPerformanceRepository.listTrendRecords(query),
      query.metric,
    );
  },
  async getDetail(query: PerformanceDetailQuery) {
    return toDetailDto(await observabilityPerformanceRepository.listDetailRecords(query));
  },
  ratePerformanceMetric,
  derivePerceivedQuality,
  worstRating,
};
