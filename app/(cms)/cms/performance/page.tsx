import { forbidden } from "next/navigation";

import { CmsPageHeader } from "@/components/cms/primitives";
import {
  ObservabilityBarChart,
  ObservabilityChartCard,
  ObservabilityEmptyState,
  ObservabilityLineChart,
  ObservabilityMetricCard,
  ObservabilityStatusBadge,
  ObservabilityTechnicalValues,
} from "@/features/cms/observability/components";
import { formatMetric, formatPercent } from "@/features/cms/observability/components/formatting";
import { hasAnyCmsRole, requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";
import { observabilityPerformancePolicy } from "@/lib/server/modules/observability-performance";
import { getTrpcCaller } from "@/lib/server/trpc/caller";

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.performance,
  description: i18n.cms.lists.performance.subtitle,
  path: "/cms/performance",
});

type CmsPerformancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsPerformancePage({ searchParams }: CmsPerformancePageProps) {
  const session = await requireCmsSession("/cms/performance");
  if (!hasAnyCmsRole(session, observabilityPerformancePolicy.allowedRoles)) forbidden();

  const params = await searchParams;
  const days = readPeriod(params.days);
  const path = readPath(params.path);
  const release = readText(params.release);
  const caller = await getTrpcCaller();
  const [summary, worstPages, lcpTrend] = await Promise.all([
    caller.performance.summary({ days, release }),
    caller.performance.worstPages({
      page: 1,
      pageSize: 8,
      query: { days, release, q: path, sortBy: "impact", sortOrder: "desc" },
    }),
    caller.performance.trend({ days, release, metric: "lcp" }),
  ]);
  const detailPath = path ?? worstPages.items[0]?.path;
  const detail = detailPath
    ? await caller.performance.detail({ days, release, path: detailPath })
    : null;
  const frustratingCount = summary.qualityBreakdown
    .filter((item) => item.quality === "frustrating" || item.quality === "broken")
    .reduce((total, item) => total + item.count, 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <CmsPageHeader title={i18n.cms.navigation.performance} />
      {summary.totalExperiences === 0 ? (
        <ObservabilityEmptyState
          title="Nessuna esperienza performance"
          description="La dashboard si popola con PerformanceExperience e aggregati giornalieri. La metrica ufficiale di interazione è INP."
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ObservabilityMetricCard label="Esperienze" value={summary.totalExperiences} />
        <ObservabilityMetricCard
          label="Frustranti o rotte"
          value={frustratingCount}
          tone={frustratingCount > 0 ? "warning" : "default"}
        />
        <ObservabilityMetricCard label="Early exit" value={summary.earlyExitCount} />
        <ObservabilityMetricCard label="Affidabilità" value={summary.sampleConfidence} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ObservabilityChartCard
          title="Trend LCP p75"
          description="Andamento giornaliero del p75. La metrica ufficiale di interazione è INP."
          confidence={summary.sampleConfidence}
        >
          <ObservabilityLineChart
            data={lcpTrend.points.map((point) => ({
              date: point.date,
              lcp: point.p75 ?? 0,
            }))}
            dataKey="lcp"
            label="LCP p75"
          />
        </ObservabilityChartCard>
        <ObservabilityChartCard
          title="Qualità percepita"
          description="Breakdown derivato da metriche, exit ed errori."
        >
          <ObservabilityBarChart
            data={summary.qualityBreakdown.map((item) => ({
              name: item.quality,
              count: item.count,
            }))}
            dataKey="count"
            label="Esperienze"
          />
        </ObservabilityChartCard>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Core Web Vitals e contesto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Valori p75 con soglie e campione. La metrica ufficiale di interazione è INP.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {summary.vitals.map((metric) => (
            <div key={metric.metric} className="border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-wide">{metric.metric}</span>
                <ObservabilityStatusBadge value={metric.rating} kind="quality" />
              </div>
              <div className="mt-4 font-heading text-2xl font-semibold">
                {formatMetric(metric.p75, metric.unit)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                good &lt;= {formatMetric(metric.goodThreshold, metric.unit)} · poor &gt;={" "}
                {formatMetric(metric.poorThreshold, metric.unit)} · n={metric.sampleCount}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-heading text-lg font-semibold">Pagine peggiori per impatto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordinamento per frizione qualitativa e confidence, non per valore tecnico massimo.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Pagina</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Sessioni</th>
                  <th className="px-5 py-3 text-right">Frizione</th>
                  <th className="px-5 py-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {worstPages.items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>
                      Le esperienze performance compariranno dopo metriche pubbliche valide.
                    </td>
                  </tr>
                ) : (
                  worstPages.items.map((item) => (
                    <tr key={item.path} className="border-t border-border">
                      <td className="px-5 py-4 font-medium">{item.path}</td>
                      <td className="px-5 py-4 text-muted-foreground">{item.pageType}</td>
                      <td className="px-5 py-4 text-right font-mono">{item.affectedSessions}</td>
                      <td className="px-5 py-4 text-right font-mono">
                        {formatPercent(item.frustratingRate)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ObservabilityStatusBadge value={item.sampleConfidence} kind="confidence" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <ObservabilityChartCard title="Worst pages" description="Frizione sulle pagine principali.">
          <ObservabilityBarChart
            data={worstPages.items.map((item) => ({
              name: item.path,
              count: item.frustratingCount,
            }))}
            dataKey="count"
            label="Frizione"
            color="var(--destructive)"
          />
        </ObservabilityChartCard>
      </section>

      {detail ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Dettaglio impatto: {detail.path}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Motivazioni derivate da metriche, engagement ed errori correlati.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.qualityReasons.length === 0 ? (
              <span className="text-sm text-muted-foreground">Nessuna motivazione specifica.</span>
            ) : (
              detail.qualityReasons.map((reason) => (
                <ObservabilityStatusBadge key={reason} value={reason} />
              ))
            )}
          </div>
          <div className="mt-5 space-y-3">
            {detail.timeline.slice(0, 5).map((item) => (
              <div
                key={`${item.observabilityEventId ?? item.occurredAt}`}
                className="border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-mono text-xs text-muted-foreground">
                    {new Date(item.occurredAt).toLocaleString("it-IT")}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ObservabilityStatusBadge value={item.perceivedQuality} kind="quality" />
                    <ObservabilityStatusBadge value={item.rating} kind="quality" />
                    {item.causedEarlyExit ? <ObservabilityStatusBadge value="early exit" /> : null}
                  </div>
                </div>
                <div className="mt-3">
                  <ObservabilityTechnicalValues
                    values={[
                      { label: "sessionId", value: item.sessionId },
                      { label: "pageInstanceId", value: item.pageInstanceId },
                      { label: "eventId", value: item.observabilityEventId },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function readPeriod(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}

function readText(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

function readPath(value: string | string[] | undefined) {
  const raw = readText(value);
  return raw?.startsWith("/") ? raw.slice(0, 512) : undefined;
}
