import { Pencil } from "lucide-react";

import {
  questionnaireHeadingId,
  questionnaireType,
  secondaryCtaClass,
} from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { QuestionnaireReviewSection } from "@/lib/questionnaires/flow";

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
    <section aria-labelledby={questionnaireHeadingId}>
      <div className="border-b-2 border-foreground pb-6">
        <h1
          id={questionnaireHeadingId}
          tabIndex={-1}
          className={cn(questionnaireType.stopTitle, "outline-none")}
        >
          {text.review.title}
        </h1>
        {sections.length === 0 ? (
          <p className={cn(questionnaireType.body, "mt-4")}>{text.review.empty}</p>
        ) : null}
      </div>

      <div className="divide-y divide-foreground/20">
        {sections.map(({ step, stepIndex, items }) => {
          const title = step.title || text.defaultStepTitle;
          const titleId = `questionnaire-review-${step.id}`;

          return (
            <section className="py-7" aria-labelledby={titleId} key={step.id}>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                <h2 id={titleId} className={questionnaireType.sectionTitle}>
                  {title}
                </h2>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={text.review.editStep(title)}
                  className={cn(secondaryCtaClass, "min-h-10 px-3.5 py-2")}
                  onClick={() => onEditStep(stepIndex)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  {text.review.edit}
                </button>
              </div>
              <dl className="mt-5 grid gap-5">
                {items.map(({ field, answer }) => (
                  <div key={field.id}>
                    <dt className="font-heading text-[14px] leading-snug font-semibold text-muted">
                      {field.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-1 font-editorial text-[18px] leading-snug break-words whitespace-pre-wrap",
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
