import { ArrowRight, Clock3, RotateCcw } from "lucide-react";

import { PublicLink } from "@/components/public/public-link";
import {
  isSafeHref,
  primaryCtaClass,
  questionnaireColumnClass,
  questionnaireType,
  secondaryCtaClass,
} from "@/components/public/questionnaires/questionnaire-ui";
import { PublicRichText } from "@/components/public/rich-text";
import { i18n } from "@/lib/i18n";
import { getEstimatedMinutes } from "@/lib/questionnaires/flow";
import { cn } from "@/lib/utils";

import type { PublicQuestionnaireDto } from "@/lib/server/modules/questionnaires/dto/public";

function QuestionnaireIntroActions({
  isLoading,
  hasDraft,
  resumeMessage,
  onStart,
}: {
  isLoading: boolean;
  hasDraft: boolean;
  resumeMessage: string;
  onStart: (restoreDraft: boolean) => void;
}) {
  const text = i18n.public.questionnaire;

  if (isLoading) {
    return (
      <p
        role="status"
        className={cn(
          questionnaireType.button,
          "mt-8 inline-flex min-h-12 items-center border border-border px-5 py-3 text-muted",
        )}
      >
        {text.loading}
      </p>
    );
  }

  if (!hasDraft) {
    return (
      <div className="mt-8">
        <button type="button" className={primaryCtaClass} onClick={() => onStart(false)}>
          {text.startCta}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {resumeMessage ? (
        <p className={cn(questionnaireType.body, "mb-4 max-w-[52ch]")}>{resumeMessage}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryCtaClass} onClick={() => onStart(true)}>
          <RotateCcw className="size-4" aria-hidden />
          {text.resumeCta}
        </button>
        <button type="button" className={secondaryCtaClass} onClick={() => onStart(false)}>
          {text.restartCta}
        </button>
      </div>
    </div>
  );
}

function QuestionnairePrivacyNotice({ notice, href }: { notice?: string; href?: string }) {
  const safeHref = isSafeHref(href) ? href : null;
  if (!notice && !safeHref) return null;

  return (
    <p className={cn(questionnaireType.help, "mt-8 max-w-[60ch] whitespace-pre-line")}>
      {notice}
      {notice && safeHref ? " " : null}
      {safeHref ? (
        <PublicLink
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-3 hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {i18n.public.questionnaire.privacyLinkLabel}
        </PublicLink>
      ) : null}
    </p>
  );
}

export function QuestionnaireIntro({
  questionnaire,
  isLoading,
  hasDraft,
  onStart,
}: {
  questionnaire: PublicQuestionnaireDto;
  isLoading: boolean;
  hasDraft: boolean;
  onStart: (restoreDraft: boolean) => void;
}) {
  const { definition } = questionnaire;
  const text = i18n.public.questionnaire;
  const estimatedMinutes = getEstimatedMinutes(definition);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 bg-background py-10 focus:outline-none sm:py-16"
    >
      <section className={questionnaireColumnClass}>
        <div data-page-reveal="body">
          <h1 className="max-w-[14ch] font-heading text-[clamp(40px,9vw,72px)] leading-[0.9] font-black tracking-[-0.05em] text-foreground">
            {questionnaire.title}
          </h1>
          {questionnaire.descriptionRich ? (
            <PublicRichText value={questionnaire.descriptionRich} className="mt-8 max-w-[60ch]" />
          ) : null}
          {definition.copy.introduction ? (
            <p className="mt-8 max-w-[60ch] font-editorial text-[clamp(18px,2.4vw,20px)] leading-[1.55] whitespace-pre-line text-body-text">
              {definition.copy.introduction}
            </p>
          ) : null}
          <dl className="mt-10 border-y border-foreground/25">
            <div className="py-4">
              <dt className={cn(questionnaireType.meta, "text-muted")}>
                {text.stats.estimatedTimeLabel}
              </dt>
              <dd className="mt-2 flex items-center gap-1.5 font-heading text-[28px] leading-none font-black tabular-nums">
                <Clock3 className="size-4 shrink-0 text-accent" aria-hidden />
                {estimatedMinutes}
                <span className="text-[15px] font-bold">{text.stats.minutes}</span>
              </dd>
            </div>
          </dl>
          <QuestionnairePrivacyNotice
            notice={definition.copy.privacyNotice}
            href={definition.copy.privacyUrl}
          />
          <QuestionnaireIntroActions
            isLoading={isLoading}
            hasDraft={hasDraft}
            resumeMessage={definition.copy.resumeMessage}
            onStart={onStart}
          />
        </div>
      </section>
    </main>
  );
}
