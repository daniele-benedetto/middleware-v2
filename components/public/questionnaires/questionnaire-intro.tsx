import { ArrowRight, Clock3, RotateCcw } from "lucide-react";

import { PublicBrand } from "@/components/public/header/public-brand";
import { PublicLink } from "@/components/public/public-link";
import { isSafeHref, primaryCtaClass } from "@/components/public/questionnaires/questionnaire-ui";
import { PublicRichText } from "@/components/public/rich-text";
import { i18n } from "@/lib/i18n";
import { getEstimatedMinutes } from "@/lib/questionnaires/flow";

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
        className="mt-8 inline-flex min-h-12 items-center border border-border px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-muted uppercase"
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
        <p className="mb-4 max-w-[52ch] font-editorial text-[18px] leading-relaxed text-body-text">
          {resumeMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" className={primaryCtaClass} onClick={() => onStart(true)}>
          <RotateCcw className="size-4" aria-hidden />
          {text.resumeCta}
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 border border-foreground px-5 py-3 font-ui text-[12px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent"
          onClick={() => onStart(false)}
        >
          {text.restartCta}
        </button>
      </div>
    </div>
  );
}

function QuestionnairePrivacyNotice({ notice, href }: { notice?: string; href?: string }) {
  const safeHref = isSafeHref(href) ? href : null;
  if (!notice && !safeHref) return null;
  const external = safeHref ? !safeHref.startsWith("/") : false;

  return (
    <p className="mt-10 max-w-[60ch] font-editorial text-[16px] leading-relaxed whitespace-pre-line text-muted">
      {notice}
      {notice && safeHref ? " " : null}
      {safeHref ? (
        <PublicLink
          href={safeHref}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
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
  /** True when there are answers to resume (stored draft or answers of this visit). */
  hasDraft: boolean;
  onStart: (restoreDraft: boolean) => void;
}) {
  const { definition } = questionnaire;
  const text = i18n.public.questionnaire;
  const estimatedMinutes = getEstimatedMinutes(definition);
  const questionCount = definition.steps
    .flatMap((current) => current.fields)
    .filter((field) => field.type !== "information").length;
  const stats = [
    { label: text.stats.stepsLabel, value: String(definition.steps.length).padStart(2, "0") },
    { label: text.stats.questionsLabel, value: String(questionCount).padStart(2, "0") },
  ];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 bg-background py-10 focus:outline-none sm:py-16"
    >
      <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="mb-6">
          <PublicBrand eager />
        </div>
        <div className="border-t-[3px] border-accent bg-card p-6 sm:p-10" data-page-reveal="body">
          <h1 className="max-w-[13ch] font-heading text-[clamp(42px,7vw,82px)] leading-[0.86] font-black tracking-[-0.06em] text-foreground">
            {questionnaire.title}
          </h1>
          {questionnaire.descriptionRich ? (
            <PublicRichText value={questionnaire.descriptionRich} className="mt-8 max-w-[60ch]" />
          ) : null}
          {definition.copy.introduction ? (
            <p className="mt-8 max-w-[60ch] font-editorial text-[20px] leading-relaxed whitespace-pre-line text-body-text">
              {definition.copy.introduction}
            </p>
          ) : null}
          <div className="mt-10 grid border-l border-t border-foreground sm:grid-cols-3">
            {stats.map((stat) => (
              <div className="border-r border-b border-foreground p-4" key={stat.label}>
                <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                  {stat.label}
                </p>
                <p className="mt-2 font-heading text-3xl leading-none font-black">{stat.value}</p>
              </div>
            ))}
            <div className="border-r border-b border-foreground p-4">
              <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                {text.stats.estimatedTimeLabel}
              </p>
              <p className="mt-2 flex items-center gap-2 font-heading text-3xl leading-none font-black">
                <Clock3 className="size-5 text-accent" aria-hidden />
                {estimatedMinutes} {text.stats.minutes}
              </p>
            </div>
          </div>
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
