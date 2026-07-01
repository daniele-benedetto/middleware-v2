import { forbidden } from "next/navigation";

import { CmsPageHeader } from "@/components/cms/primitives";
import {
  ObservabilityAreaChart,
  ObservabilityBarChart,
  ObservabilityChartCard,
  ObservabilityEmptyState,
  ObservabilityMetricCard,
  QualityScoreBreakdown,
  formatDuration,
  formatPercent,
} from "@/features/cms/observability/components";
import { TelemetryContentTable } from "@/features/cms/observability/screens/telemetry-content-table";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { buildCmsMetadata } from "@/lib/seo";
import { telemetryPolicy } from "@/lib/server/modules/telemetry";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

export const metadata = buildCmsMetadata({
  title: "Telemetry",
  description: "Qualità editoriale, letture qualificate e completamenti.",
  path: "/cms/telemetry",
});

type CmsTelemetryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsTelemetryPage({ searchParams }: CmsTelemetryPageProps) {
  const session = await requireCmsSession("/cms/telemetry");
  if (!hasAnyCmsRole(session, telemetryPolicy.allowedRoles)) forbidden();

  const params = await searchParams;
  const days = readPeriod(params.days);
  const caller = await getTrpcCaller();
  const [summary, aggregates] = await Promise.all([
    caller.telemetry.engagementSummary({ days }),
    caller.observabilityAggregates.overview({ days }),
  ]);
  const topQuality = [...aggregates.content].sort((a, b) => b.qualityScore - a.qualityScore)[0];

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <CmsPageHeader title="Telemetry" />
      {summary.qualifiedVisits === 0 && aggregates.content.length === 0 ? (
        <ObservabilityEmptyState
          title="Nessun engagement aggregato"
          description="La pagina si popola quando ContentEngagement e DailyContentQualityAggregate contengono episodi qualitativi. Le page view non vengono usate come fallback."
        />
      ) : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ObservabilityMetricCard label="Letture qualificate" value={summary.qualifiedVisits} />
        <ObservabilityMetricCard label="Completamenti" value={summary.completedReads} />
        <ObservabilityMetricCard
          label="Completion rate"
          value={formatPercent(summary.completionRate)}
        />
        <ObservabilityMetricCard
          label="Tempo attivo medio"
          value={formatDuration(summary.averageActiveTimeMs)}
        />
        <ObservabilityMetricCard label="Affidabilità" value={summary.sampleConfidence} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <QualityScoreBreakdown
          score={topQuality?.qualityScore}
          components={topQuality?.qualityScoreComponents}
          confidence={topQuality?.sampleConfidence}
        />
        <ObservabilityChartCard
          title="Trend engagement"
          description="Letture qualificate e completamenti dagli aggregati giornalieri."
          confidence={summary.sampleConfidence}
        >
          <ObservabilityAreaChart
            data={groupContentTrend(aggregates.content)}
            series={[
              { key: "qualified", label: "Qualificate", color: "var(--foreground)" },
              { key: "completed", label: "Complete", color: "var(--accent)" },
            ]}
          />
        </ObservabilityChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <ObservabilityChartCard
          title="Breakdown engagement"
          description="Episodi interpretati, non view grezze."
        >
          <ObservabilityBarChart
            data={summary.engagementBreakdown.map((item) => ({
              name: item.level,
              count: item.count,
            }))}
            dataKey="count"
            label="Episodi"
          />
        </ObservabilityChartCard>
        <TelemetryContentTable
          days={days}
          items={summary.topContent}
          sampleConfidence={summary.sampleConfidence}
        />
      </section>
    </div>
  );
}

type AggregateOverview = Awaited<
  ReturnType<Awaited<ReturnType<typeof getTrpcCaller>>["observabilityAggregates"]["overview"]>
>;

function groupContentTrend(rows: AggregateOverview["content"]) {
  const grouped = new Map<string, { date: string; qualified: number; completed: number }>();
  for (const row of rows) {
    const item = grouped.get(row.date) ?? { date: row.date, qualified: 0, completed: 0 };
    item.qualified += row.qualifiedVisits;
    item.completed += row.completedReads;
    grouped.set(row.date, item);
  }
  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function readPeriod(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}
