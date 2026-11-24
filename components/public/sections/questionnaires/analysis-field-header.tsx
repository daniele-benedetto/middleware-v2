import { publicTypography } from "@/components/public/primitives";
import { cn } from "@/lib/utils";

import { getAnalysisFieldAnchorId } from "./analysis-format";

import type { AnalysisField } from "./analysis-field";

export function AnalysisFieldHeader({ field }: { field: AnalysisField }) {
  return (
    <header className="grid shrink-0 gap-2">
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
    </header>
  );
}
