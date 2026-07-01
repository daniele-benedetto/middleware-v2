import { forbidden } from "next/navigation";

import { CopyTechnicalValueButton } from "@/components/cms/common/copy-technical-value-button";
import { CmsPageHeader } from "@/components/cms/primitives";
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

export default async function CmsPerformancePage() {
  const session = await requireCmsSession("/cms/performance");

  if (!hasAnyCmsRole(session, observabilityPerformancePolicy.allowedRoles)) {
    forbidden();
  }

  const caller = await getTrpcCaller();
  const [summary, worstPages, lcpTrend] = await Promise.all([
    caller.performance.summary({ days: 30 }),
    caller.performance.worstPages({
      page: 1,
      pageSize: 8,
      query: { days: 30, sortBy: "impact", sortOrder: "desc" },
    }),
    caller.performance.trend({ days: 30, metric: "lcp" }),
  ]);
  const detail = worstPages.items[0]
    ? await caller.performance.detail({ days: 30, path: worstPages.items[0].path })
    : null;

  const frustratingBreakdown = summary.qualityBreakdown.filter(
    (item) => item.quality === "frustrating" || item.quality === "broken",
  );
  const frustratingCount = frustratingBreakdown.reduce((total, item) => total + item.count, 0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <CmsPageHeader title={i18n.cms.navigation.performance} />
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Esperienze" value={summary.totalExperiences.toString()} />
        <MetricCard label="Frustranti o rotte" value={frustratingCount.toString()} />
        <MetricCard label="Early exit" value={summary.earlyExitCount.toString()} />
        <MetricCard label="Affidabilita" value={summary.sampleConfidence} />
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Core Web Vitals e contesto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le metriche sono interpretate come esperienza percepita. FID non e raccolto.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {summary.vitals.map((metric) => (
            <div key={metric.metric} className="border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase tracking-wide">{metric.metric}</span>
                <span className="rounded-full bg-muted px-2 py-1 text-xs">{metric.rating}</span>
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
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Trend LCP p75</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Andamento giornaliero del p75, con campione e rating tecnico.
          </p>
          <div className="mt-5 space-y-2">
            {lcpTrend.points.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun campione trend disponibile.</p>
            ) : (
              lcpTrend.points.slice(-10).map((point) => (
                <div key={point.date} className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{point.date}</span>
                  <span className="font-mono">{formatMetric(point.p75, lcpTrend.unit)}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    n={point.sampleCount}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Segmenti pagina critica</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Device e rete per la pagina con maggiore impatto qualitativo.
          </p>
          {detail ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <SegmentList title="Device" items={detail.deviceSegments} />
              <SegmentList title="Rete" items={detail.connectionSegments} />
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">Nessun dettaglio disponibile.</p>
          )}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Qualita percepita</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Breakdown derivato da metriche, exit precoce ed errori correlati.
          </p>
          <div className="mt-5 space-y-3">
            {summary.qualityBreakdown.map((item) => (
              <div key={item.quality} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium capitalize">{item.quality}</span>
                <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-heading text-lg font-semibold">Pagine peggiori per impatto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordinamento per frizione qualitativa, non per singolo valore tecnico.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Pagina</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3 text-right">Sessioni</th>
                  <th className="px-5 py-3 text-right">Campioni</th>
                  <th className="px-5 py-3 text-right">Frizione</th>
                  <th className="px-5 py-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {worstPages.items.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-muted-foreground" colSpan={6}>
                      Le esperienze PerformanceExperience compariranno dopo metriche pubbliche
                      valide.
                    </td>
                  </tr>
                ) : (
                  worstPages.items.map((item) => (
                    <tr key={item.path} className="border-t border-border">
                      <td className="px-5 py-4 font-medium">{item.path}</td>
                      <td className="px-5 py-4 text-muted-foreground">{item.pageType}</td>
                      <td className="px-5 py-4 text-right font-mono">{item.affectedSessions}</td>
                      <td className="px-5 py-4 text-right font-mono">{item.sampleCount}</td>
                      <td className="px-5 py-4 text-right font-mono">
                        {formatPercent(item.frustratingRate)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">{item.sampleConfidence}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
                <span key={reason} className="rounded-full border border-border px-3 py-1 text-xs">
                  {reason}
                </span>
              ))
            )}
          </div>
          <div className="mt-5 overflow-hidden border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Qualita</th>
                  <th className="px-4 py-3">Tecnici</th>
                </tr>
              </thead>
              <tbody>
                {detail.timeline.slice(0, 5).map((item) => (
                  <tr
                    key={`${item.observabilityEventId ?? item.occurredAt}`}
                    className="border-t border-border"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(item.occurredAt).toLocaleString("it-IT")}
                    </td>
                    <td className="px-4 py-3">
                      {item.perceivedQuality} · {item.rating}
                      {item.causedEarlyExit ? " · early exit" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <CopyTechnicalValueButton label="sessionId" value={item.sessionId} />
                        <CopyTechnicalValueButton
                          label="pageInstanceId"
                          value={item.pageInstanceId}
                        />
                        <CopyTechnicalValueButton
                          label="eventId"
                          value={item.observabilityEventId}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SegmentList({
  title,
  items,
}: {
  title: string;
  items: Array<{ value: string; count: number; frustratingRate: number }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun segmento.</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item.value} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{item.value}</span>
              <span className="font-mono text-xs">
                {item.count} · {formatPercent(item.frustratingRate)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-3 font-heading text-3xl font-semibold">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMetric(value: number | null, unit: "ms" | "unitless") {
  if (value === null) return "n/a";
  if (unit === "unitless") return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}
