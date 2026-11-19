import { publicTypography } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { formatQuestionNumber, getAnalysisFieldAnchorId } from "./analysis-format";
import { formatChartNumber, formatChartRange } from "./charts/chart-format";

import type { AnalysisField } from "./charts/analysis-views";

const strings = i18n.public.questionnaireAnalysis;

type Stat = { label: string; value: string };

function buildStats(field: AnalysisField): Stat[] {
  const stats: Stat[] = [
    { label: strings.validResponses, value: formatChartNumber(field.responseCount) },
  ];
  if (field.missingCount > 0) {
    stats.push({
      label: strings.missingResponses,
      value: formatChartNumber(field.missingCount),
    });
  }
  if (field.kind !== "number" || field.responseCount === 0) return stats;

  if (field.average !== null) {
    stats.push({ label: strings.average, value: formatChartNumber(field.average) });
  }
  if (field.median !== null) {
    stats.push({ label: strings.median, value: formatChartNumber(field.median) });
  }
  if (field.minimum !== null && field.maximum !== null) {
    stats.push({
      label: strings.range,
      value: formatChartRange(field.minimum, field.maximum),
    });
  }
  return stats;
}

export function AnalysisFieldHeader({
  field,
  index,
  total,
}: {
  field: AnalysisField;
  index: number;
  total: number;
}) {
  return (
    <header className="grid gap-4">
      <div className="grid gap-2">
        <p className={cn(publicTypography.smallKicker, "text-accent")}>
          {strings.questionPosition(formatQuestionNumber(index), total)}
        </p>
        <h3
          id={getAnalysisFieldAnchorId(field.id)}
          data-field-id={field.id}
          className="scroll-mt-[var(--public-issue-anchor-offset)] font-heading text-[clamp(22px,2.4vw,32px)] leading-[1.12] font-black tracking-[-0.02em] text-balance text-foreground"
        >
          {field.label}
        </h3>
        {field.description ? (
          <p className={cn(publicTypography.editorialSmall, "max-w-[68ch] text-body-text")}>
            {field.description}
          </p>
        ) : null}
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-foreground/20 py-3">
        {buildStats(field).map((stat) => (
          <div key={stat.label} className="grid gap-1">
            <dt className="font-ui text-[11px] font-bold tracking-[0.03em] text-muted uppercase">
              {stat.label}
            </dt>
            <dd className="font-heading text-xl leading-none font-black tracking-[-0.02em] text-foreground tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
