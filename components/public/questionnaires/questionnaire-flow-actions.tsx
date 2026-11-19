import { ArrowLeft, ArrowRight } from "lucide-react";

/** Sticky footer of the form: the "back" button and the primary (submit) button of the stop. */
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
    <div className="sticky bottom-0 z-30 -mx-4 mt-8 flex flex-col-reverse gap-3 border-t-2 border-foreground bg-background px-4 py-4 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <button
        type="button"
        disabled={backDisabled}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-foreground px-4 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover disabled:border-border disabled:text-muted sm:w-auto"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </button>
      <button
        type="submit"
        disabled={primaryDisabled}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-foreground px-5 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-background uppercase transition-colors hover:bg-accent disabled:bg-muted sm:w-auto"
        aria-describedby={primaryDescribedBy}
      >
        {primaryLabel}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
