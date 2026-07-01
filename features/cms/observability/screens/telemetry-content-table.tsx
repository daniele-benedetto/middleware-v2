"use client";

import { useState } from "react";

import {
  ObservabilityBarChart,
  ObservabilityDetailDrawer,
  ObservabilityMetricCard,
  ObservabilityStatusBadge,
  ObservabilityTechnicalValues,
  formatDuration,
  formatPercent,
} from "@/features/cms/observability/components";
import { trpc } from "@/lib/trpc/react";

import type { RouterOutputs } from "@/lib/trpc/types";

type TelemetrySummary = RouterOutputs["telemetry"]["engagementSummary"];
type TelemetryTopContent = TelemetrySummary["topContent"][number];

type TelemetryContentTableProps = {
  days: number;
  items: TelemetryTopContent[];
  sampleConfidence: TelemetrySummary["sampleConfidence"];
};

export function TelemetryContentTable({
  days,
  items,
  sampleConfidence,
}: TelemetryContentTableProps) {
  const [selected, setSelected] = useState<TelemetryTopContent | null>(null);
  const detailQuery = trpc.telemetry.contentEngagementDetail.useQuery(
    {
      days,
      contentId: selected?.contentId ?? undefined,
      path: selected?.contentId ? undefined : selected?.path,
    },
    { enabled: Boolean(selected), staleTime: 30_000 },
  );
  const detail = detailQuery.data;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="font-heading text-lg font-semibold">Contenuti per qualità</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordinati per letture qualificate e completamenti, senza usare page views legacy.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Contenuto</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3 text-right">Qualificate</th>
                <th className="px-5 py-3 text-right">Complete</th>
                <th className="px-5 py-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-muted-foreground" colSpan={5}>
                    Gli episodi qualitativi compariranno dopo le prime visite pubbliche.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.contentId ?? item.path}-${item.pageType}`}
                    className="cursor-pointer border-t border-border hover:bg-muted/50"
                    onClick={() => setSelected(item)}
                  >
                    <td className="px-5 py-4 font-medium">{item.slug ?? item.path}</td>
                    <td className="px-5 py-4 text-muted-foreground">{item.pageType}</td>
                    <td className="px-5 py-4 text-right font-mono">{item.qualifiedVisits}</td>
                    <td className="px-5 py-4 text-right font-mono">{item.completedReads}</td>
                    <td className="px-5 py-4 text-right">
                      <ObservabilityStatusBadge value={sampleConfidence} kind="confidence" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ObservabilityDetailDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.slug ?? selected?.path ?? "Dettaglio contenuto"}
        description="Breakdown dell'episodio interpretato, con ritorni significativi separati dai refresh tecnici."
      >
        {detailQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Caricamento dettaglio engagement.</p>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              <ObservabilityMetricCard label="Qualificate" value={detail.qualifiedVisits} />
              <ObservabilityMetricCard label="Complete" value={detail.completedReads} />
              <ObservabilityMetricCard
                label="Completion"
                value={formatPercent(detail.completionRate)}
              />
              <ObservabilityMetricCard
                label="Tempo medio"
                value={formatDuration(detail.averageActiveTimeMs)}
                confidence={detail.sampleConfidence}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <ObservabilityBarChart
                data={detail.engagementBreakdown.map((item) => ({
                  name: item.level,
                  count: item.count,
                }))}
                dataKey="count"
                label="Episodi"
              />
              <ObservabilityBarChart
                data={detail.exitBreakdown.map((item) => ({
                  name: item.exitType,
                  count: item.count,
                }))}
                dataKey="count"
                label="Exit"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <ObservabilityMetricCard
                label="Ritorni significativi"
                value={detail.returnCountInSession}
              />
              <ObservabilityMetricCard label="Refresh tecnici" value={detail.refreshCount} />
              <ObservabilityMetricCard label="Max scroll" value={`${detail.maxScrollDepth}%`} />
            </div>
            {detail.audio ? (
              <div className="grid gap-3 md:grid-cols-3">
                <ObservabilityMetricCard label="Audio start" value={detail.audio.starts} />
                <ObservabilityMetricCard
                  label="Ascolto medio"
                  value={formatDuration(detail.audio.averageListenedMs)}
                />
                <ObservabilityMetricCard
                  label="Audio completion"
                  value={formatPercent(detail.audio.averageCompletionRate)}
                />
              </div>
            ) : null}
            <ObservabilityTechnicalValues
              values={[
                { label: "contentId", value: detail.contentId },
                { label: "path", value: detail.path },
              ]}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nessun dettaglio disponibile.</p>
        )}
      </ObservabilityDetailDrawer>
    </>
  );
}
