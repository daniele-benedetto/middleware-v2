import { Pencil } from "lucide-react";

import { questionnaireHeadingId } from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { QuestionnaireReviewSection } from "@/lib/questionnaires/flow";

/** Last stop before submitting: the answers grouped by step, each step editable. */
export function QuestionnaireReview({
  sections,
  disabled,
  onEditStep,
}: {
  sections: QuestionnaireReviewSection[];
  disabled: boolean;
  onEditStep: (stepIndex: number) => void;
}) {
  const text = i18n.public.questionnaire;

  return (
    <section
      aria-labelledby={questionnaireHeadingId}
      className="border-t-[3px] border-accent bg-card p-5 sm:p-8"
    >
      <div className="border-b border-foreground pb-6">
        <h1
          id={questionnaireHeadingId}
          tabIndex={-1}
          className="font-heading text-[clamp(30px,4vw,48px)] leading-[0.94] font-black tracking-[-0.045em] text-foreground outline-none"
        >
          {text.review.title}
        </h1>
        {sections.length === 0 ? (
          <p className="mt-4 font-editorial text-[18px] leading-relaxed text-body-text">
            {text.review.empty}
          </p>
        ) : null}
      </div>

      <div className="divide-y divide-foreground">
        {sections.map(({ step, stepIndex, items }) => {
          const title = step.title || text.defaultStepTitle;
          const titleId = `questionnaire-review-${step.id}`;

          return (
            <section className="py-7" aria-labelledby={titleId} key={step.id}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <h2
                  id={titleId}
                  className="font-heading text-[clamp(20px,2.4vw,27px)] leading-[1.05] font-black tracking-[-0.025em] text-foreground"
                >
                  {title}
                </h2>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={text.review.editStep(title)}
                  className="inline-flex min-h-11 items-center gap-2 border border-foreground px-4 py-2.5 font-ui text-[11px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:border-border disabled:text-muted"
                  onClick={() => onEditStep(stepIndex)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  {text.review.edit}
                </button>
              </div>
              <dl className="mt-5 grid gap-5">
                {items.map(({ field, answer }) => (
                  <div key={field.id}>
                    <dt className="font-ui text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
                      {field.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-1.5 font-editorial text-[18px] leading-snug break-words whitespace-pre-wrap",
                        answer === null ? "text-muted italic" : "text-body-text",
                      )}
                    >
                      {answer ?? text.review.unanswered}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </section>
  );
}
