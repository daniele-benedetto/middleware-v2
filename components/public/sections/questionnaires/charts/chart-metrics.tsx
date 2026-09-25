import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ChartMetrics({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; accent?: boolean }>;
}) {
  return (
    <dl className="grid grid-cols-2 border-l border-t border-foreground sm:grid-cols-4">
      {metrics.map((metric) => (
        <div className="border-r border-b border-foreground px-3 py-3" key={metric.label}>
          <dt className="font-ui text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
            {metric.label}
          </dt>
          <dd
            className={cn(
              "mt-1 font-heading text-lg font-black tabular-nums",
              metric.accent && "text-accent",
            )}
          >
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function defaultResponseMetrics(
  responseCount: number,
  missingCount: number,
): Array<{ label: string; value: string; accent?: boolean }> {
  return [
    { label: i18n.public.questionnaireAnalysis.validResponses, value: String(responseCount) },
    { label: i18n.public.questionnaireAnalysis.missingResponses, value: String(missingCount) },
  ];
}
