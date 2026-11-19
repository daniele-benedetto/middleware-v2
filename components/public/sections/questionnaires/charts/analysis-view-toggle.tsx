"use client";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { AnalysisView } from "./analysis-views";

export function AnalysisViewToggle({
  views,
  activeView,
  onChange,
}: {
  views: AnalysisView[];
  activeView: AnalysisView;
  onChange: (view: AnalysisView) => void;
}) {
  if (views.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={i18n.public.questionnaireAnalysis.viewToggleAriaLabel}
      className="inline-flex border border-foreground"
    >
      {views.map((view) => {
        const pressed = view === activeView;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(view)}
            className={cn(
              "min-h-9 cursor-pointer border-r border-foreground px-3 font-ui text-[11px] font-bold tracking-[0.03em] uppercase last:border-r-0 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2",
              pressed
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:bg-surface-hover",
            )}
          >
            {i18n.public.questionnaireAnalysis.viewLabels[view]}
          </button>
        );
      })}
    </div>
  );
}
