import { ArrowRight } from "lucide-react";

import { PublicLink } from "@/components/public/public-link";
import {
  primaryCtaClass,
  questionnaireColumnClass,
  questionnaireType,
} from "@/components/public/questionnaires/questionnaire-ui";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { CSSProperties } from "react";

export type QuestionnaireThankYouReceipt = {
  answered: number;
  total: number;
  submittedAt: string;
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(date);
}

/** Staggered entrance: every animated piece shares one class and differs only by delay. */
function delay(milliseconds: number): CSSProperties {
  return { animationDelay: `${milliseconds}ms` };
}

function ThankYouSeal() {
  return (
    <div className="relative size-18" aria-hidden>
      <span className="questionnaire-thanks-ring absolute inset-0 rounded-full bg-accent" />
      <span
        className="questionnaire-thanks-pop relative flex size-full items-center justify-center rounded-full bg-accent text-accent-foreground"
        style={delay(80)}
      >
        <svg viewBox="0 0 24 24" className="size-9" fill="none">
          <path
            className="questionnaire-thanks-draw"
            style={delay(380)}
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={2.75}
            strokeLinecap="square"
            pathLength={1}
          />
        </svg>
      </span>
    </div>
  );
}

function ThankYouReceipt({ receipt }: { receipt: QuestionnaireThankYouReceipt }) {
  const text = i18n.public.questionnaire.thankYou;
  const submittedAt = formatSubmittedAt(receipt.submittedAt);

  return (
    <dl
      className="questionnaire-thanks-rise mt-10 grid grid-cols-2 border-t-2 border-dashed border-foreground/40 pt-5"
      style={delay(620)}
    >
      <div className="pr-4">
        <dt className={cn(questionnaireType.meta, "text-muted")}>{text.answersLabel}</dt>
        <dd className="mt-2 font-heading text-[28px] leading-none font-black tabular-nums">
          {receipt.answered}
          <span className="text-[15px] font-bold text-muted"> / {receipt.total}</span>
        </dd>
      </div>
      {submittedAt ? (
        <div className="border-l border-foreground/25 pl-4">
          <dt className={cn(questionnaireType.meta, "text-muted")}>{text.submittedAtLabel}</dt>
          <dd className="mt-2 font-heading text-[17px] leading-tight font-bold">{submittedAt}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * Closing screen of the questionnaire. It is deliberately not a system screen: it thanks the
 * respondent, recaps what was sent and points to what happens next.
 */
export function QuestionnaireThankYou({
  variant,
  questionnaireTitle,
  title,
  message,
  receipt,
  showResultsNote,
  actionHref,
  actionLabel,
}: {
  /** "submitted" right after sending; "already" when the answers came from an earlier visit. */
  variant: "submitted" | "already";
  questionnaireTitle: string;
  title: string;
  message: string;
  receipt?: QuestionnaireThankYouReceipt;
  showResultsNote: boolean;
  actionHref: string;
  actionLabel: string;
}) {
  const text = i18n.public.questionnaire.thankYou;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex flex-1 overflow-hidden bg-background py-14 focus:outline-none sm:py-20"
    >
      {/* Decorative halo: an oversized accent disc bleeding off the corner. */}
      <span
        aria-hidden
        className="questionnaire-thanks-halo pointer-events-none absolute -top-[18vmax] -right-[18vmax] size-[52vmax] rounded-full bg-accent/[0.07]"
      />
      <section className={cn(questionnaireColumnClass, "relative")}>
        <ThankYouSeal />
        <p
          className={cn(questionnaireType.meta, "questionnaire-thanks-rise mt-10 text-accent")}
          style={delay(260)}
        >
          {variant === "submitted" ? text.kicker : text.alreadyKicker}
        </p>
        <h1
          className="questionnaire-thanks-rise mt-4 max-w-[12ch] font-heading text-[clamp(52px,13vw,104px)] leading-[0.86] font-black tracking-[-0.06em] text-foreground"
          style={delay(320)}
        >
          {title}
        </h1>
        <span
          aria-hidden
          className="questionnaire-thanks-rule mt-6 block h-1.5 w-24 origin-left bg-accent"
          style={delay(520)}
        />
        <p
          className="questionnaire-thanks-rise mt-8 max-w-[34ch] font-editorial text-[clamp(21px,3.2vw,26px)] leading-[1.4] text-foreground"
          style={delay(440)}
        >
          {variant === "submitted"
            ? text.lead(questionnaireTitle)
            : text.alreadyLead(questionnaireTitle)}
        </p>
        {message ? (
          <p
            className={cn(
              questionnaireType.body,
              "questionnaire-thanks-rise mt-4 max-w-[52ch] whitespace-pre-line",
            )}
            style={delay(500)}
          >
            {message}
          </p>
        ) : null}
        {receipt ? <ThankYouReceipt receipt={receipt} /> : null}
        {showResultsNote ? (
          <p
            className={cn(
              questionnaireType.help,
              "questionnaire-thanks-rise mt-6 max-w-[52ch] border-l-[3px] border-accent pl-4",
            )}
            style={delay(680)}
          >
            {text.resultsNote}
          </p>
        ) : null}
        <div className="questionnaire-thanks-rise mt-10" style={delay(740)}>
          <PublicLink href={actionHref} className={primaryCtaClass}>
            {actionLabel}
            <ArrowRight className="size-4" aria-hidden />
          </PublicLink>
        </div>
      </section>
    </main>
  );
}
