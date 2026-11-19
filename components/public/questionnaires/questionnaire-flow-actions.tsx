import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  primaryCtaClass,
  questionnaireColumnClass,
  secondaryCtaClass,
} from "@/components/public/questionnaires/questionnaire-ui";
import { cn } from "@/lib/utils";

/**
 * Footer of the form: the "back" button and the primary (submit) button of the stop, always on
 * one row, stuck to the bottom of the screen.
 */
export function QuestionnaireFlowActions({
  backLabel,
  backDisabled,
  primaryLabel,
  primaryDisabled,
  primaryDescribedBy,
  onBack,
}: {
  backLabel: string;
  backDisabled: boolean;
  primaryLabel: string;
  primaryDisabled: boolean;
  primaryDescribedBy: string;
  onBack: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-30 mt-10 border-t border-foreground bg-background">
      <div
        className={cn(
          questionnaireColumnClass,
          "flex items-center gap-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <button
          type="button"
          disabled={backDisabled}
          className={cn(secondaryCtaClass, "shrink-0 px-4")}
          onClick={onBack}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {backLabel}
        </button>
        <button
          type="submit"
          disabled={primaryDisabled}
          className={cn(primaryCtaClass, "min-w-0 flex-1 sm:ml-auto sm:flex-none sm:px-8")}
          aria-describedby={primaryDescribedBy}
        >
          <span className="truncate">{primaryLabel}</span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </button>
      </div>
    </div>
  );
}
