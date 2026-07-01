import "server-only";

import { observabilityOverviewRepository } from "@/lib/server/modules/observability-overview/repository";

import type {
  ObservabilityHealthScoreDto,
  ObservabilityInsightDto,
  ObservabilityOverviewDto,
} from "@/lib/server/modules/observability-overview/dto";
import type {
  ObservabilityInsightSeverity,
  ObservabilityOverviewQuery,
} from "@/lib/server/modules/observability-overview/schema";

type SampleConfidence = "low" | "medium" | "high";
type DateWindow = { from: Date; to: Date };
type ScoreInput = {
  impact: number;
  confidence: SampleConfidence;
  recency: number;
  severity: ObservabilityInsightSeverity;
  actionability: number;
};

const unknown = "unknown";
const scoringVersion = "observability-insights-v1";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date;
}

function currentWindow(days: number): DateWindow {
  return { from: daysAgo(days), to: new Date() };
}

function previousWindow(days: number, currentFrom: Date): DateWindow {
  const from = new Date(currentFrom);
  from.setUTCDate(from.getUTCDate() - days);
  return { from, to: currentFrom };
}

function dateRange(window: DateWindow) {
  return { from: window.from.toISOString(), to: window.to.toISOString() };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  return values.length ? sum(values) / values.length : null;
}

function confidenceWeight(confidence: SampleConfidence) {
  if (confidence === "high") return 100;
  if (confidence === "medium") return 65;
  return 25;
}

function severityWeight(severity: ObservabilityInsightSeverity) {
  if (severity === "critical") return 100;
  if (severity === "high") return 80;
  if (severity === "medium") return 50;
  return 25;
}

function confidenceRank(confidence: SampleConfidence) {
  if (confidence === "high") return 3;
  if (confidence === "medium") return 2;
  return 1;
}

function resolveConfidence(values: string[]): SampleConfidence {
  if (!values.length) return "low";
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function severityFromScore(score: number): ObservabilityInsightSeverity {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function calculateInsightScore(input: ScoreInput) {
  return Math.round(
    clamp(
      input.impact * 0.4 +
        confidenceWeight(input.confidence) * 0.2 +
        input.recency * 0.15 +
        severityWeight(input.severity) * 0.15 +
        input.actionability * 0.1,
    ),
  );
}

function makeInsight(
  input: Omit<ObservabilityInsightDto, "id" | "dateRange"> & { window: DateWindow },
) {
  const { window, ...insight } = input;
  const entityKey = input.primaryEntity.id ?? input.primaryEntity.label;
  return {
    ...insight,
    id: `${input.type}:${entityKey}`.toLowerCase().replace(/[^a-z0-9:_-]+/g, "-"),
    dateRange: dateRange(window),
  } satisfies ObservabilityInsightDto;
}

function metric(label: string, value: string | number | boolean, unit: string | null = null) {
  return { label, value, unit };
}

function entity(
  type: ObservabilityInsightDto["primaryEntity"]["type"],
  label: string,
  id: string | null = null,
  href: string | null = null,
) {
  return { type, id, label, href };
}

function link(label: string, href: string) {
  return { label, href };
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) grouped.set(keyFn(item), [...(grouped.get(keyFn(item)) ?? []), item]);
  return grouped;
}

function qualityRatio(row: { qualifiedVisits: number; totalVisits: number }) {
  return row.totalVisits ? row.qualifiedVisits / row.totalVisits : 0;
}

function completionRate(row: { completedReads: number; qualifiedVisits: number }) {
  return row.qualifiedVisits ? row.completedReads / row.qualifiedVisits : 0;
}

function poorPerformanceCount(row: { frustratingCount: number; brokenCount: number }) {
  return row.frustratingCount + row.brokenCount;
}

function severityFromError(value: string): ObservabilityInsightSeverity {
  if (value === "CRITICAL") return "critical";
  if (value === "HIGH") return "high";
  if (value === "MEDIUM") return "medium";
  return "low";
}

function recencyFromDate(date: Date, window: DateWindow) {
  const span = Math.max(1, window.to.getTime() - window.from.getTime());
  const age = Math.max(0, window.to.getTime() - date.getTime());
  return clamp(100 - (age / span) * 100);
}

export function calculateHealthScore(input: {
  criticalHighErrors: number;
  regressions: number;
  frustratingOrBrokenExperiences: number;
  highCriticalAuditActivities: number;
  sensitiveAuditFailures: number;
  averageQualityScore: number | null;
  confidence: SampleConfidence;
}): ObservabilityHealthScoreDto {
  const errorPenalty = clamp(input.criticalHighErrors * 8 + input.regressions * 12, 0, 45);
  const performancePenalty = clamp(input.frustratingOrBrokenExperiences * 2, 0, 25);
  const auditPenalty = clamp(
    input.highCriticalAuditActivities * 3 + input.sensitiveAuditFailures * 8,
    0,
    25,
  );
  const confidencePenalty = input.confidence === "low" ? 10 : input.confidence === "medium" ? 4 : 0;
  const contentBonus = input.averageQualityScore
    ? clamp((input.averageQualityScore - 60) / 4, 0, 8)
    : 0;
  const score = Math.round(
    clamp(
      100 - errorPenalty - performancePenalty - auditPenalty - confidencePenalty + contentBonus,
    ),
  );
  const status =
    score < 45 ? "critical" : score < 70 ? "degraded" : score < 85 ? "watch" : "healthy";

  return {
    score,
    status,
    confidence: input.confidence,
    components: [
      metric("versione scoring", scoringVersion),
      metric("quality score medio", input.averageQualityScore ?? "n/a"),
    ],
    penalties: [
      metric("errori critical/high", errorPenalty),
      metric("performance frustrante/rotta", performancePenalty),
      metric("audit high/critical", auditPenalty),
      metric("confidence", confidencePenalty),
    ],
    bonuses: [metric("qualità contenuti", Math.round(contentBonus))],
    reasons: [
      ...(input.criticalHighErrors ? ["critical_high_errors"] : []),
      ...(input.regressions ? ["critical_regression"] : []),
      ...(input.frustratingOrBrokenExperiences ? ["poor_performance_high"] : []),
      ...(input.sensitiveAuditFailures ? ["sensitive_audit_failure"] : []),
      ...(input.confidence !== "high" ? ["low_sample_confidence"] : []),
    ],
  };
}

export const observabilityOverviewService = {
  async overview(query: ObservabilityOverviewQuery): Promise<ObservabilityOverviewDto> {
    const window = currentWindow(query.days);
    const previous = previousWindow(query.days, window.from);
    const [content, performance, errors, audit, previousPerformance, previousErrors] =
      await Promise.all([
        observabilityOverviewRepository.listContentAggregates(window, query),
        observabilityOverviewRepository.listPerformanceAggregates(window, query),
        observabilityOverviewRepository.listErrorAggregates(window, query),
        observabilityOverviewRepository.listAuditAggregates(window, query),
        observabilityOverviewRepository.listPerformanceAggregates(previous, query),
        observabilityOverviewRepository.listErrorAggregates(previous, query),
      ]);

    const kpis = {
      qualifiedVisits: sum(content.map((row) => row.qualifiedVisits)),
      completedReads: sum(content.map((row) => row.completedReads)),
      averageQualityScore: (() => {
        const value = average(content.map((row) => row.qualityScore));
        return value === null ? null : Math.round(value);
      })(),
      frustratingOrBrokenExperiences: sum(performance.map(poorPerformanceCount)),
      criticalHighErrors: sum(errors.map((row) => row.criticalHighGroups)),
      errorRegressions: sum(errors.map((row) => row.regressions)),
      highCriticalAuditActivities: sum(audit.map((row) => row.highCriticalCount)),
      sensitiveAuditFailures: sum(audit.map((row) => row.failureCount + row.sensitiveActionCount)),
    };
    const confidence = resolveConfidence([
      ...content.map((row) => row.sampleConfidence),
      ...performance.map((row) => row.sampleConfidence),
    ]);
    const insights = await buildInsights({
      query,
      window,
      content,
      performance,
      errors,
      audit,
      previousPerformance,
      previousErrors,
    });
    const visibleInsights = query.includeLowConfidence
      ? insights
      : insights.filter((item) => item.confidence !== "low" || item.severity === "critical");
    const ranked = visibleInsights
      .sort(
        (first, second) =>
          second.score - first.score ||
          severityWeight(second.severity) - severityWeight(first.severity) ||
          confidenceRank(second.confidence) - confidenceRank(first.confidence),
      )
      .slice(0, query.limit);

    return {
      period: { ...dateRange(window), days: query.days },
      healthScore: calculateHealthScore({
        ...kpis,
        regressions: kpis.errorRegressions,
        confidence,
      }),
      kpis,
      watchFirst: ranked.slice(0, 5),
      insights: ranked,
      trends: buildTrends({ content, performance, errors, audit }),
      confidence,
    };
  },
};

type BuildInsightsInput = {
  query: ObservabilityOverviewQuery;
  window: DateWindow;
  content: Awaited<ReturnType<typeof observabilityOverviewRepository.listContentAggregates>>;
  performance: Awaited<
    ReturnType<typeof observabilityOverviewRepository.listPerformanceAggregates>
  >;
  errors: Awaited<ReturnType<typeof observabilityOverviewRepository.listErrorAggregates>>;
  audit: Awaited<ReturnType<typeof observabilityOverviewRepository.listAuditAggregates>>;
  previousPerformance: Awaited<
    ReturnType<typeof observabilityOverviewRepository.listPerformanceAggregates>
  >;
  previousErrors: Awaited<ReturnType<typeof observabilityOverviewRepository.listErrorAggregates>>;
};

async function buildInsights(input: BuildInsightsInput) {
  const insightGroups = await Promise.all([
    buildContentPerformanceInsights(input),
    buildOpenedNotReadInsights(input),
    buildContentOpportunityInsights(input),
    buildReleasePerformanceInsights(input),
    buildReleaseErrorInsights(input),
    buildCriticalErrorInsights(input),
    buildBlockingErrorInsights(input),
    buildAuditErrorInsights(input),
    buildAuditFailureInsights(input),
    buildReferrerInsights(input),
  ]);
  const deduped = new Map<string, ObservabilityInsightDto>();
  for (const insight of insightGroups.flat()) {
    const existing = deduped.get(insight.id);
    if (!existing || insight.score > existing.score) deduped.set(insight.id, insight);
  }
  return Array.from(deduped.values());
}

async function buildContentPerformanceInsights(input: BuildInsightsInput) {
  const performanceByPath = groupBy(input.performance, (row) => `${row.contentId}:${row.path}`);
  return input.content
    .filter((row) => row.qualityScore >= 65 && row.qualifiedVisits >= 5)
    .flatMap((row) => {
      const perfRows = performanceByPath.get(`${row.contentId}:${row.path}`) ?? [];
      const poor = sum(perfRows.map(poorPerformanceCount));
      const total = sum(perfRows.map((item) => item.totalExperiences));
      if (!total || poor / total < 0.25) return [];
      const confidence = resolveConfidence([
        row.sampleConfidence,
        ...perfRows.map((item) => item.sampleConfidence),
      ]);
      const score = calculateInsightScore({
        impact: clamp(row.qualityScore + poor),
        confidence,
        recency: recencyFromDate(row.date, input.window),
        severity: poor / total > 0.5 ? "high" : "medium",
        actionability: 90,
      });
      return makeInsight({
        type: "high_interest_poor_performance",
        title: "Contenuto forte frenato dalla performance",
        description: `${row.path} ha interesse qualificato, ma una quota rilevante di esperienze e' frustrante o rotta.`,
        severity: severityFromScore(score),
        score,
        confidence,
        reasons: ["quality_score_high", "poor_performance_high"],
        primaryEntity: entity(
          "content",
          row.path,
          row.contentId === unknown ? null : row.contentId,
          `/cms/telemetry?path=${encode(row.path)}`,
        ),
        relatedEntities: [
          entity("path", row.path, null, `/cms/performance?path=${encode(row.path)}`),
        ],
        metrics: [
          metric("quality score", row.qualityScore),
          metric("letture qualificate", Math.round(row.qualifiedVisits)),
          metric("esperienze frustranti/rotte", poor),
          metric("poor rate", total ? `${Math.round((poor / total) * 100)}%` : "n/a"),
        ],
        deepLinks: [
          link("Apri telemetry", `/cms/telemetry?path=${encode(row.path)}`),
          link("Apri performance", `/cms/performance?path=${encode(row.path)}`),
        ],
        window: input.window,
      });
    });
}

async function buildOpenedNotReadInsights(input: BuildInsightsInput) {
  return input.content
    .filter((row) => row.totalVisits >= 10 && qualityRatio(row) < 0.25)
    .map((row) => {
      const confidence = row.sampleConfidence as SampleConfidence;
      const score = calculateInsightScore({
        impact: clamp(row.totalVisits),
        confidence,
        recency: recencyFromDate(row.date, input.window),
        severity: row.totalVisits >= 50 ? "high" : "medium",
        actionability: 85,
      });
      return makeInsight({
        type: "opened_not_read",
        title: "Contenuto iniziato ma poco letto",
        description: `${row.path} genera episodi iniziati, ma pochi diventano letture qualificate.`,
        severity: severityFromScore(score),
        score,
        confidence,
        reasons: ["completion_rate_low", "qualified_ratio_low"],
        primaryEntity: entity(
          "content",
          row.path,
          row.contentId === unknown ? null : row.contentId,
          `/cms/telemetry?path=${encode(row.path)}`,
        ),
        relatedEntities: [],
        metrics: [
          metric("episodi iniziati", Math.round(row.totalVisits)),
          metric("letture qualificate", Math.round(row.qualifiedVisits)),
          metric("qualified ratio", `${Math.round(qualityRatio(row) * 100)}%`),
        ],
        deepLinks: [link("Apri telemetry", `/cms/telemetry?path=${encode(row.path)}`)],
        window: input.window,
      });
    });
}

async function buildContentOpportunityInsights(input: BuildInsightsInput) {
  return input.content
    .filter((row) => row.qualityScore >= 75 && row.qualifiedVisits < 20 && row.qualifiedVisits >= 3)
    .map((row) => {
      const confidence = row.sampleConfidence as SampleConfidence;
      const score = calculateInsightScore({
        impact: row.qualityScore,
        confidence,
        recency: recencyFromDate(row.date, input.window),
        severity: "medium",
        actionability: 70,
      });
      return makeInsight({
        type: "content_quality_opportunity",
        title: "Contenuto piccolo ma molto qualificato",
        description: `${row.path} ha pochi episodi, ma quality score e completamento indicano valore editoriale.`,
        severity: "medium",
        score,
        confidence,
        reasons: ["quality_score_high", "sample_limited"],
        primaryEntity: entity(
          "content",
          row.path,
          row.contentId === unknown ? null : row.contentId,
          `/cms/telemetry?path=${encode(row.path)}`,
        ),
        relatedEntities: [],
        metrics: [
          metric("quality score", row.qualityScore),
          metric("completion rate", `${Math.round(completionRate(row) * 100)}%`),
        ],
        deepLinks: [link("Apri telemetry", `/cms/telemetry?path=${encode(row.path)}`)],
        window: input.window,
      });
    });
}

async function buildReleasePerformanceInsights(input: BuildInsightsInput) {
  const current = groupBy(
    input.performance.filter((row) => row.release !== unknown),
    (row) => row.release,
  );
  const previous = groupBy(
    input.previousPerformance.filter((row) => row.release !== unknown),
    (row) => row.release,
  );
  return Array.from(current.entries()).flatMap(([release, rows]) => {
    const previousRows = previous.get(release) ?? [];
    const total = sum(rows.map((row) => row.totalExperiences));
    const poor = sum(rows.map(poorPerformanceCount));
    const previousTotal = sum(previousRows.map((row) => row.totalExperiences));
    const previousPoor = sum(previousRows.map(poorPerformanceCount));
    const rate = total ? poor / total : 0;
    const previousRate = previousTotal ? previousPoor / previousTotal : 0;
    if (total < 10 || rate - previousRate < 0.15) return [];
    const confidence = resolveConfidence(rows.map((row) => row.sampleConfidence));
    const score = calculateInsightScore({
      impact: clamp((rate - previousRate) * 100),
      confidence,
      recency: 80,
      severity: rate > 0.5 ? "high" : "medium",
      actionability: 85,
    });
    return makeInsight({
      type: "release_performance_regression",
      title: "Release con regressione performance",
      description: `La release ${release} mostra un peggioramento della qualita' percepita rispetto alla finestra precedente.`,
      severity: severityFromScore(score),
      score,
      confidence,
      reasons: ["release_delta_negative", "poor_performance_high"],
      primaryEntity: entity(
        "release",
        release,
        release,
        `/cms/performance?release=${encode(release)}`,
      ),
      relatedEntities: [],
      metrics: [
        metric("poor rate corrente", `${Math.round(rate * 100)}%`),
        metric("poor rate precedente", `${Math.round(previousRate * 100)}%`),
        metric("esperienze", total),
      ],
      deepLinks: [link("Apri performance", `/cms/performance?release=${encode(release)}`)],
      window: input.window,
    });
  });
}

async function buildReleaseErrorInsights(input: BuildInsightsInput) {
  const current = groupBy(
    input.errors.filter((row) => row.release !== unknown),
    (row) => row.release,
  );
  const previous = groupBy(
    input.previousErrors.filter((row) => row.release !== unknown),
    (row) => row.release,
  );
  return Array.from(current.entries()).flatMap(([release, rows]) => {
    const previousRows = previous.get(release) ?? [];
    const currentCritical = sum(rows.map((row) => row.criticalHighGroups + row.regressions));
    const previousCritical = sum(
      previousRows.map((row) => row.criticalHighGroups + row.regressions),
    );
    if (currentCritical <= previousCritical || currentCritical === 0) return [];
    const score = calculateInsightScore({
      impact: clamp(currentCritical * 20),
      confidence: "high",
      recency: 85,
      severity: currentCritical >= 3 ? "critical" : "high",
      actionability: 95,
    });
    return makeInsight({
      type: "release_error_regression",
      title: "Release con aumento errori operativi",
      description: `La release ${release} ha piu' errori critical/high o regressioni rispetto al periodo precedente.`,
      severity: severityFromScore(score),
      score,
      confidence: "high",
      reasons: ["release_delta_negative", "critical_regression"],
      primaryEntity: entity("release", release, release, `/cms/errors?release=${encode(release)}`),
      relatedEntities: [],
      metrics: [
        metric("critical/high + regressioni", currentCritical),
        metric("periodo precedente", previousCritical),
      ],
      deepLinks: [link("Apri errori", `/cms/errors?release=${encode(release)}`)],
      window: input.window,
    });
  });
}

async function buildCriticalErrorInsights(input: BuildInsightsInput) {
  const groups = await observabilityOverviewRepository.listCriticalErrorGroups(
    input.window,
    input.query,
  );
  return groups.map((group) => {
    const severity = group.regression ? "critical" : severityFromError(group.severity);
    const score = calculateInsightScore({
      impact: clamp(group.priorityScore),
      confidence: "high",
      recency: recencyFromDate(group.lastSeenAt, input.window),
      severity,
      actionability: 100,
    });
    return makeInsight({
      type: "critical_error_regression",
      title: group.regression ? "Regressione errore operativa" : "Errore critical/high aperto",
      description: group.title,
      severity: severityFromScore(score),
      score,
      confidence: "high",
      reasons: [
        group.regression ? "critical_regression" : "critical_high_errors",
        ...jsonReasons(group.priorityReasons),
      ],
      primaryEntity: entity("error_group", group.title, group.id, `/cms/errors?status=open`),
      relatedEntities: group.lastRelease
        ? [
            entity(
              "release",
              group.lastRelease,
              group.lastRelease,
              `/cms/errors?release=${encode(group.lastRelease)}`,
            ),
          ]
        : [],
      metrics: [
        metric("priority score", group.priorityScore),
        metric("occorrenze", group.occurrenceCount),
        metric("sessioni impattate", group.affectedSessions),
      ],
      deepLinks: [link("Apri inbox errori", `/cms/errors?status=open`)],
      window: input.window,
    });
  });
}

async function buildBlockingErrorInsights(input: BuildInsightsInput) {
  const candidates = await observabilityOverviewRepository.listBlockingErrorExitCandidates(
    input.window,
  );
  return candidates
    .filter((candidate) => candidate.relatedExitCount > 0)
    .map((candidate) => {
      const severity = candidate.errorGroup.regression
        ? "critical"
        : severityFromError(candidate.errorGroup.severity);
      const score = calculateInsightScore({
        impact: clamp(candidate.relatedExitCount * 25 + candidate.errorGroup.priorityScore),
        confidence: "medium",
        recency: recencyFromDate(candidate.occurredAt, input.window),
        severity,
        actionability: 95,
      });
      const path = candidate.path ?? unknown;
      return makeInsight({
        type: "blocking_error_with_exits",
        title: "Errore correlato a exit o esperienza rotta",
        description: candidate.errorGroup.title,
        severity: severityFromScore(score),
        score,
        confidence: "medium",
        reasons: ["blocked_action", "early_exit_after_poor_performance"],
        primaryEntity: entity(
          "error_group",
          candidate.errorGroup.title,
          candidate.errorGroup.id,
          `/cms/errors?status=open`,
        ),
        relatedEntities: [entity("path", path, null, `/cms/performance?path=${encode(path)}`)],
        metrics: [
          metric("exit correlati", candidate.relatedExitCount),
          metric("sessionId", candidate.sessionId ?? "n/a"),
        ],
        deepLinks: [
          link("Apri errori", `/cms/errors?status=open`),
          link("Apri performance", `/cms/performance?path=${encode(path)}`),
        ],
        window: input.window,
      });
    });
}

async function buildAuditErrorInsights(input: BuildInsightsInput) {
  const candidates = await observabilityOverviewRepository.listAuditErrorCandidates(input.window);
  return candidates
    .filter((candidate) => candidate.relatedErrorCount > 0)
    .map((candidate) => {
      const severity = candidate.riskLevel === "CRITICAL" ? "critical" : "high";
      const score = calculateInsightScore({
        impact: clamp(candidate.relatedErrorCount * 30),
        confidence: "medium",
        recency: recencyFromDate(candidate.createdAt, input.window),
        severity,
        actionability: 90,
      });
      return makeInsight({
        type: "audit_risk_followed_by_error",
        title: "Audit ad alto rischio seguito da errore",
        description: `${candidate.action} su ${candidate.resourceType} ha errori correlati nel contesto request/correlation.`,
        severity: severityFromScore(score),
        score,
        confidence: "medium",
        reasons: ["high_risk_audit", "error_after_audit"],
        primaryEntity: entity(
          "audit_activity",
          `${candidate.action} ${candidate.resourceType}`,
          candidate.id,
          `/cms/audit?riskLevel=${candidate.riskLevel.toLowerCase()}`,
        ),
        relatedEntities: [],
        metrics: [
          metric("errori correlati", candidate.relatedErrorCount),
          metric("outcome", candidate.outcome),
        ],
        deepLinks: [
          link("Apri audit", `/cms/audit?riskLevel=${candidate.riskLevel.toLowerCase()}`),
          link("Apri errori", `/cms/errors?status=open`),
        ],
        window: input.window,
      });
    });
}

async function buildAuditFailureInsights(input: BuildInsightsInput) {
  return input.audit
    .filter(
      (row) => row.failureCount > 0 && (row.highCriticalCount > 0 || row.sensitiveActionCount > 0),
    )
    .map((row) => {
      const score = calculateInsightScore({
        impact: clamp(row.failureCount * 20 + row.sensitiveActionCount * 15),
        confidence: "high",
        recency: recencyFromDate(row.date, input.window),
        severity: row.riskLevel === "CRITICAL" ? "critical" : "high",
        actionability: 90,
      });
      return makeInsight({
        type: "audit_failure_sensitive_action",
        title: "Fallimento su azione sensibile",
        description: `${row.action} su ${row.resourceType} ha fallimenti con rischio ${row.riskLevel.toLowerCase()}.`,
        severity: severityFromScore(score),
        score,
        confidence: "high",
        reasons: ["sensitive_audit_failure", "high_risk_audit"],
        primaryEntity: entity(
          "audit_activity",
          `${row.action} ${row.resourceType}`,
          null,
          `/cms/audit?outcome=failure`,
        ),
        relatedEntities: [],
        metrics: [
          metric("fallimenti", row.failureCount),
          metric("azioni sensibili", row.sensitiveActionCount),
        ],
        deepLinks: [link("Apri audit", `/cms/audit?outcome=failure`)],
        window: input.window,
      });
    });
}

async function buildReferrerInsights(input: BuildInsightsInput) {
  const rows = await observabilityOverviewRepository.listReferrerQualityCandidates(input.window);
  const grouped = groupBy(rows, (row) => row.session?.referrerDomain ?? unknown);
  return Array.from(grouped.entries()).flatMap(([referrer, groupRows]) => {
    if (referrer === unknown || groupRows.length < 3) return [];
    const qualified = groupRows.filter(
      (row) => row.engagementLevel === "engaged" || row.engagementLevel === "completed",
    ).length;
    const completed = groupRows.filter((row) => row.completed).length;
    const completion = qualified ? completed / qualified : 0;
    if (completion < 0.5) return [];
    const confidence: SampleConfidence =
      groupRows.length >= 30 ? "high" : groupRows.length >= 10 ? "medium" : "low";
    const score = calculateInsightScore({
      impact: clamp(completion * 100 + qualified),
      confidence,
      recency: 75,
      severity: "medium",
      actionability: 65,
    });
    return makeInsight({
      type: "referrer_quality_opportunity",
      title: "Referrer piccolo ma qualificato",
      description: `${referrer} porta poche sessioni ma una quota alta di letture complete.`,
      severity: "medium",
      score,
      confidence,
      reasons: ["referrer_quality_high", "completion_rate_high"],
      primaryEntity: entity("referrer", referrer, referrer, `/cms/telemetry`),
      relatedEntities: [],
      metrics: [
        metric("episodi", groupRows.length),
        metric("letture qualificate", qualified),
        metric("completion rate", `${Math.round(completion * 100)}%`),
      ],
      deepLinks: [link("Apri telemetry", `/cms/telemetry`)],
      window: input.window,
    });
  });
}

function buildTrends(input: {
  content: BuildInsightsInput["content"];
  performance: BuildInsightsInput["performance"];
  errors: BuildInsightsInput["errors"];
  audit: BuildInsightsInput["audit"];
}) {
  const dates = new Map<string, ObservabilityOverviewDto["trends"][number]>();
  const ensure = (date: string) => {
    const existing = dates.get(date);
    if (existing) return existing;
    const next = {
      date,
      qualifiedVisits: 0,
      completedReads: 0,
      frustratingOrBrokenExperiences: 0,
      criticalHighErrors: 0,
      highCriticalAuditActivities: 0,
    };
    dates.set(date, next);
    return next;
  };
  for (const row of input.content) {
    const item = ensure(row.date.toISOString().slice(0, 10));
    item.qualifiedVisits += row.qualifiedVisits;
    item.completedReads += row.completedReads;
  }
  for (const row of input.performance) {
    ensure(row.date.toISOString().slice(0, 10)).frustratingOrBrokenExperiences +=
      poorPerformanceCount(row);
  }
  for (const row of input.errors) {
    ensure(row.date.toISOString().slice(0, 10)).criticalHighErrors += row.criticalHighGroups;
  }
  for (const row of input.audit) {
    ensure(row.date.toISOString().slice(0, 10)).highCriticalAuditActivities +=
      row.highCriticalCount;
  }
  return Array.from(dates.values()).sort((first, second) => first.date.localeCompare(second.date));
}

function jsonReasons(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
