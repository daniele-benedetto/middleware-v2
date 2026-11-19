import { Check } from "lucide-react";

import {
  questionnaireColumnClass,
  questionnaireType,
} from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** One short line that never wraps: the header keeps its height while answers are saved. */
function DraftStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  const text = i18n.public.questionnaire.draftStatus;

  return (
    <p className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      {status === "saved" ? (
        <>
          <Check className="size-3 shrink-0" aria-hidden />
          {text.saved}
        </>
      ) : status === "saving" ? (
        text.saving
      ) : null}
    </p>
  );
}

/**
 * Sticky header of the form: where the user is ("Sezione X di Y" or the review) and how many
 * of the visible questions have been answered (the progress bar). Its height is fixed: every
 * line is a single, non-wrapping one, so the page below never moves when its texts change.
 */
export function QuestionnaireProgressHeader({
  label,
  position,
  answered,
  total,
  draftStatus,
}: {
  /** `copy.progressLabel`, a plain label ("Avanzamento") that names the bar. */
  label: string;
  /** "Sezione X di Y" or the title of the review. */
  position: string;
  answered: number;
  total: number;
  draftStatus: "idle" | "saving" | "saved";
}) {
  const questionProgress = i18n.public.questionnaire.questionProgress(answered, total);
  const percentage = total > 0 ? (answered / total) * 100 : 0;

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className={cn(questionnaireColumnClass, "pt-3 sm:pt-4")}>
        <div className="flex h-7 items-center justify-between gap-4">
          <p className="truncate font-heading text-[15px] leading-none font-extrabold tracking-[-0.01em] text-foreground">
            {position}
          </p>
          <p className={cn(questionnaireType.meta, "shrink-0 whitespace-nowrap text-muted")}>
            {questionProgress}
          </p>
        </div>
        <div
          aria-label={label || position}
          aria-valuemax={Math.max(total, 1)}
          aria-valuemin={0}
          aria-valuenow={answered}
          aria-valuetext={`${questionProgress} · ${position}`}
          className="mt-2 h-1 bg-foreground/15"
          role="progressbar"
        >
          <div
            className="h-full bg-accent transition-[width] duration-(--motion-base) ease-(--easing-standard)"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className={cn(questionnaireType.meta, "flex h-7 items-center justify-end text-muted")}>
          <DraftStatus status={draftStatus} />
        </div>
      </div>
      <div className="border-b border-foreground/15" />
    </header>
  );
}
