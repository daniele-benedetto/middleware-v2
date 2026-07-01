import Link from "next/link";
import { forbidden } from "next/navigation";

import { CmsPageHeader } from "@/components/cms/primitives";
import {
  ObservabilityAreaChart,
  ObservabilityBarChart,
  ObservabilityChartCard,
  ObservabilityEmptyState,
  ObservabilityMetricCard,
  ObservabilityStatusBadge,
  QualityScoreBreakdown,
  formatPercent,
} from "@/features/cms/observability/components";
import { requireCmsSession } from "@/lib/cms/auth";
import { buildCmsMetadata } from "@/lib/seo";
import { canReadObservabilityAggregates } from "@/lib/server/modules/observability-aggregates";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

export const metadata = buildCmsMetadata({
  title: "Osservabilità",
  description: "Stato qualitativo di contenuti, performance, errori e audit.",
  path: "/cms/observability",
});

export default async function CmsObservabilityPage() {
  const session = await requireCmsSession("/cms/observability");
  if (!canReadObservabilityAggregates(session.user.role)) forbidden();

  const caller = await getTrpcCaller();
  const overview = await caller.observabilityAggregates.overview({ days: 30 });
  const contentTotals = buildContentTotals(overview.content);
  const performanceTotals = buildPerformanceTotals(overview.performance);
  const errorTotals = buildErrorTotals(overview.errors);
  const auditTotals = buildAuditTotals(overview.audit);
  const topContent = [...overview.content].sort((a, b) => b.qualityScore - a.qualityScore)[0];
  const hasData =
    overview.content.length +
      overview.performance.length +
      overview.errors.length +
      overview.audit.length >
    0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <CmsPageHeader title="Osservabilità" />
      {!hasData ? (
        <ObservabilityEmptyState
          title="Aggregati osservabilità non ancora disponibili"
          description="Esegui i job Fase 7 per popolare quality score, performance, errori e audit storici. La UI non usa raw event come fallback legacy."
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <ObservabilityMetricCard
          label="Quality score medio"
          value={contentTotals.averageQualityScore ?? "n/a"}
          description="Media dei contenuti aggregati"
          confidence={contentTotals.sampleConfidence}
        />
        <ObservabilityMetricCard
          label="Letture qualificate"
          value={contentTotals.qualifiedVisits}
        />
        <ObservabilityMetricCard label="Completamenti" value={contentTotals.completedReads} />
        <ObservabilityMetricCard
          label="Esperienze frustranti"
          value={performanceTotals.frustratingOrBroken}
          tone={performanceTotals.frustratingOrBroken > 0 ? "warning" : "default"}
          confidence={performanceTotals.sampleConfidence}
        />
        <ObservabilityMetricCard
          label="Errori critical/high"
          value={errorTotals.criticalHighGroups}
          tone={errorTotals.criticalHighGroups > 0 ? "critical" : "default"}
        />
        <ObservabilityMetricCard
          label="Audit high/critical"
          value={auditTotals.highCriticalCount}
          tone={auditTotals.highCriticalCount > 0 ? "warning" : "default"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <ObservabilityChartCard
          title="Cosa guardare prima"
          description="Priorità operative aggregate, non insight predittivi della Fase 9."
          question="Quale area richiede attenzione ora?"
        >
          <div className="space-y-3">
            <PriorityLink
              href="/cms/errors"
              title="Errori operativi"
              value={`${errorTotals.criticalHighGroups} critical/high · ${errorTotals.regressions} regressioni`}
              active={errorTotals.criticalHighGroups + errorTotals.regressions > 0}
            />
            <PriorityLink
              href="/cms/performance"
              title="Performance percepita"
              value={`${performanceTotals.frustratingOrBroken} esperienze frustranti/rotte · ${performanceTotals.earlyExitRate}`}
              active={performanceTotals.frustratingOrBroken > 0}
            />
            <PriorityLink
              href="/cms/telemetry"
              title="Qualità contenuti"
              value={`${contentTotals.qualifiedVisits} letture qualificate · ${contentTotals.completionRate}`}
              active={contentTotals.qualifiedVisits > 0}
            />
            <PriorityLink
              href="/cms/audit"
              title="Audit responsabilità"
              value={`${auditTotals.failureCount} fallimenti · ${auditTotals.highCriticalCount} high/critical`}
              active={auditTotals.failureCount + auditTotals.highCriticalCount > 0}
            />
          </div>
        </ObservabilityChartCard>

        <QualityScoreBreakdown
          score={topContent?.qualityScore}
          components={topContent?.qualityScoreComponents}
          confidence={topContent?.sampleConfidence}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ObservabilityChartCard
          title="Trend qualità contenuti"
          description="Letture qualificate e completamenti dagli aggregati giornalieri."
          confidence={contentTotals.sampleConfidence}
        >
          <ObservabilityAreaChart
            data={groupContentTrend(overview.content)}
            series={[
              { key: "qualified", label: "Qualificate", color: "var(--foreground)" },
              { key: "completed", label: "Complete", color: "var(--accent)" },
            ]}
          />
        </ObservabilityChartCard>
        <ObservabilityChartCard
          title="Performance percepita"
          description="Breakdown qualitativo aggregato."
        >
          <ObservabilityBarChart
            data={[
              { name: "smooth", count: performanceTotals.smooth },
              { name: "acceptable", count: performanceTotals.acceptable },
              { name: "frustrating", count: performanceTotals.frustrating },
              { name: "broken", count: performanceTotals.broken },
            ]}
            dataKey="count"
            label="Esperienze"
            color="var(--foreground)"
          />
        </ObservabilityChartCard>
        <ObservabilityChartCard
          title="Errori per impatto"
          description="Severity/status dagli aggregati errori."
        >
          <ObservabilityBarChart
            data={groupErrorsBySeverity(overview.errors)}
            dataKey="count"
            label="Gruppi"
            color="var(--destructive)"
          />
        </ObservabilityChartCard>
        <ObservabilityChartCard
          title="Audit per rischio"
          description="Responsabilità e azioni sensibili."
        >
          <ObservabilityBarChart
            data={groupAuditByRisk(overview.audit)}
            dataKey="count"
            label="Attività"
            color="var(--accent)"
          />
        </ObservabilityChartCard>
      </section>
    </div>
  );
}

function PriorityLink({
  href,
  title,
  value,
  active,
}: {
  href: string;
  title: string;
  value: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted"
    >
      <div>
        <div className="font-heading text-sm font-semibold">{title}</div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{value}</div>
      </div>
      <ObservabilityStatusBadge value={active ? "attenzione" : "ok"} />
    </Link>
  );
}

type Overview = Awaited<
  ReturnType<Awaited<ReturnType<typeof getTrpcCaller>>["observabilityAggregates"]["overview"]>
>;

function buildContentTotals(rows: Overview["content"]) {
  const qualifiedVisits = Math.round(sum(rows.map((row) => row.qualifiedVisits)));
  const completedReads = Math.round(sum(rows.map((row) => row.completedReads)));
  const averageQualityScore = rows.length
    ? Math.round(sum(rows.map((row) => row.qualityScore)) / rows.length)
    : null;
  return {
    qualifiedVisits,
    completedReads,
    averageQualityScore,
    completionRate: formatPercent(qualifiedVisits ? completedReads / qualifiedVisits : 0),
    sampleConfidence: resolveConfidence(rows.map((row) => row.sampleConfidence)),
  };
}

function buildPerformanceTotals(rows: Overview["performance"]) {
  const total = sum(rows.map((row) => row.totalExperiences));
  const frustrating = sum(rows.map((row) => row.frustratingCount));
  const broken = sum(rows.map((row) => row.brokenCount));
  return {
    smooth: Math.max(0, total - frustrating - broken),
    acceptable: 0,
    frustrating,
    broken,
    frustratingOrBroken: frustrating + broken,
    earlyExitRate: formatPercent(
      total ? sum(rows.map((row) => row.poorRate * row.totalExperiences)) / total : 0,
    ),
    sampleConfidence: resolveConfidence(rows.map((row) => row.sampleConfidence)),
  };
}

function buildErrorTotals(rows: Overview["errors"]) {
  return {
    criticalHighGroups: sum(rows.map((row) => row.criticalHighGroups)),
    regressions: sum(rows.map((row) => row.regressions)),
  };
}

function buildAuditTotals(rows: Overview["audit"]) {
  return {
    highCriticalCount: sum(rows.map((row) => row.highCriticalCount)),
    failureCount: sum(rows.map((row) => row.failureCount)),
  };
}

function groupContentTrend(rows: Overview["content"]) {
  const grouped = new Map<string, { date: string; qualified: number; completed: number }>();
  for (const row of rows) {
    const item = grouped.get(row.date) ?? { date: row.date, qualified: 0, completed: 0 };
    item.qualified += row.qualifiedVisits;
    item.completed += row.completedReads;
    grouped.set(row.date, item);
  }
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function groupErrorsBySeverity(rows: Overview["errors"]) {
  return groupBy(
    rows,
    (row) => row.severity,
    (row) => row.criticalHighGroups || row.newGroups,
  );
}

function groupAuditByRisk(rows: Overview["audit"]) {
  return groupBy(
    rows,
    (row) => row.riskLevel,
    (row) => row.activityCount,
  );
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string, valueFn: (row: T) => number) {
  const grouped = new Map<string, number>();
  for (const row of rows) grouped.set(keyFn(row), (grouped.get(keyFn(row)) ?? 0) + valueFn(row));
  return Array.from(grouped, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count,
  );
}

function resolveConfidence(values: Array<"low" | "medium" | "high">) {
  if (!values.length || values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
