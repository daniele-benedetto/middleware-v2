import { forbidden } from "next/navigation";

import { CmsPageHeader } from "@/components/cms/primitives";
import {
  ObservabilityAreaChart,
  ObservabilityBarChart,
  ObservabilityChartCard,
  ObservabilityEmptyState,
  ObservabilityHealthScore,
  ObservabilityInsightCard,
  ObservabilityMetricCard,
} from "@/features/cms/observability/components";
import { formatPercent } from "@/features/cms/observability/components/formatting";
import { requireCmsSession } from "@/lib/cms/auth";
import { buildCmsMetadata } from "@/lib/seo";
import { canReadObservabilityOverview } from "@/lib/server/modules/observability-overview";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

export const metadata = buildCmsMetadata({
  title: "Osservabilita",
  description: "Insight trasversali su contenuti, performance, errori e audit.",
  path: "/cms/observability",
});

type CmsObservabilityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsObservabilityPage({ searchParams }: CmsObservabilityPageProps) {
  const session = await requireCmsSession("/cms/observability");
  if (!canReadObservabilityOverview(session.user.role)) forbidden();

  const params = await searchParams;
  const days = readPeriod(params.days);
  const caller = await getTrpcCaller();
  const overview = await caller.observabilityOverview.overview({ days });
  const hasData =
    overview.kpis.qualifiedVisits +
      overview.kpis.frustratingOrBrokenExperiences +
      overview.kpis.criticalHighErrors +
      overview.kpis.highCriticalAuditActivities >
    0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <CmsPageHeader title="Osservabilita" />
      {!hasData ? (
        <ObservabilityEmptyState
          title="Insight osservabilita non ancora disponibili"
          description="La overview si popola quando aggregati e tabelle interpretate contengono dati sufficienti. Non usa page views, raw event o fallback legacy."
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <ObservabilityHealthScore score={overview.healthScore} />
        <ObservabilityChartCard
          title="Cosa guardare prima"
          description="Insight ordinati per impatto, severita, confidence e azionabilita."
          confidence={overview.confidence}
        >
          {overview.watchFirst.length === 0 ? (
            <ObservabilityEmptyState
              title="Nessuna priorita calcolata"
              description="Non ci sono ancora correlazioni sufficienti o il campione e troppo basso per suggerire priorita operative."
            />
          ) : (
            <div className="space-y-3">
              {overview.watchFirst.map((insight) => (
                <ObservabilityInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </ObservabilityChartCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ObservabilityMetricCard
          label="Quality score medio"
          value={overview.kpis.averageQualityScore ?? "n/a"}
          confidence={overview.confidence}
        />
        <ObservabilityMetricCard
          label="Letture qualificate"
          value={Math.round(overview.kpis.qualifiedVisits)}
          description={`${Math.round(overview.kpis.completedReads)} completamenti · ${formatPercent(
            overview.kpis.qualifiedVisits
              ? overview.kpis.completedReads / overview.kpis.qualifiedVisits
              : 0,
          )}`}
        />
        <ObservabilityMetricCard
          label="Performance frustrante"
          value={overview.kpis.frustratingOrBrokenExperiences}
          tone={overview.kpis.frustratingOrBrokenExperiences > 0 ? "warning" : "default"}
        />
        <ObservabilityMetricCard
          label="Rischi operativi"
          value={overview.kpis.criticalHighErrors + overview.kpis.highCriticalAuditActivities}
          description={`${overview.kpis.errorRegressions} regressioni · ${overview.kpis.sensitiveAuditFailures} failure sensibili`}
          tone={
            overview.kpis.criticalHighErrors + overview.kpis.highCriticalAuditActivities > 0
              ? "critical"
              : "default"
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ObservabilityChartCard
          title="Trend qualita contenuti"
          description="Letture qualificate e completamenti nel periodo."
          confidence={overview.confidence}
        >
          <ObservabilityAreaChart
            data={overview.trends.map((point) => ({
              date: point.date,
              qualified: point.qualifiedVisits,
              completed: point.completedReads,
            }))}
            series={[
              { key: "qualified", label: "Qualificate", color: "hsl(var(--foreground))" },
              { key: "completed", label: "Complete", color: "hsl(var(--accent))" },
            ]}
          />
        </ObservabilityChartCard>
        <ObservabilityChartCard
          title="Rischio operativo"
          description="Performance frustrante, errori critical/high e audit high/critical."
          confidence={overview.confidence}
        >
          <ObservabilityBarChart
            data={[
              {
                name: "performance",
                count: overview.kpis.frustratingOrBrokenExperiences,
              },
              { name: "errori", count: overview.kpis.criticalHighErrors },
              { name: "audit", count: overview.kpis.highCriticalAuditActivities },
            ]}
            dataKey="count"
            label="Segnali"
            color="hsl(var(--destructive))"
          />
        </ObservabilityChartCard>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Insight calcolati</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ogni card espone score, confidence, ragioni e deep link. La logica vive nel service
            server.
          </p>
        </div>
        {overview.insights.length === 0 ? (
          <ObservabilityEmptyState
            title="Nessun insight nel periodo"
            description="Allarga il periodo o genera gli aggregati: senza evidenza sufficiente la overview non inventa correlazioni."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {overview.insights.map((insight) => (
              <ObservabilityInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function readPeriod(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}
