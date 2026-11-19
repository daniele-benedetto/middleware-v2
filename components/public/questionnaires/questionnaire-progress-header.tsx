import { Check } from "lucide-react";

import { PublicBrand } from "@/components/public/header/public-brand";
import { i18n } from "@/lib/i18n";

function DraftStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  const text = i18n.public.questionnaire.draftStatus;

  return (
    <p className="flex items-center gap-1.5 text-right">
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
 * of the visible questions have been answered (the progress bar).
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
      <div className="mx-auto w-full max-w-3xl px-4 pt-3 sm:px-6 sm:pt-5">
        <div className="flex items-center justify-between gap-4">
          <PublicBrand eager />
          <p className="text-right font-heading text-[15px] leading-tight font-black">
            {label ? (
              <span className="block font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                {label}
              </span>
            ) : null}
            {position}
          </p>
        </div>
        <div
          aria-label={label || position}
          aria-valuemax={Math.max(total, 1)}
          aria-valuemin={0}
          aria-valuenow={answered}
          aria-valuetext={`${questionProgress} · ${position}`}
          className="mt-3 h-0.75 bg-foreground/15"
          role="progressbar"
        >
          <div
            className="h-full bg-accent transition-[width] duration-(--motion-base) ease-(--easing-standard)"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1.5 flex min-h-4 items-start justify-between gap-4 font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
          <p>{questionProgress}</p>
          <DraftStatus status={draftStatus} />
        </div>
      </div>
    </header>
  );
}
