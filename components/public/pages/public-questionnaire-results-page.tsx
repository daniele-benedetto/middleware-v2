import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { AnalysisFieldResults } from "@/components/public/sections/questionnaires/analysis-field-results";
import {
  formatAnalysisClosedDate,
  formatQuestionNumber,
  getAnalysisFieldAnchorId,
} from "@/components/public/sections/questionnaires/analysis-format";
import { i18n } from "@/lib/i18n";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { cn } from "@/lib/utils";

import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

const text = i18n.public.questionnaireAnalysis;
const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

function ResultsMetaRail({ analysis }: { analysis: PublicQuestionnaireAnalysisDto }) {
  const items = [
    {
      key: "closed",
      label: text.closedOn(formatAnalysisClosedDate(analysis.closedAt)),
      dateTime: analysis.closedAt,
    },
    ...(analysis.totalResponses === undefined
      ? []
      : [{ key: "responses", label: text.resultsPage.totalResponses(analysis.totalResponses) }]),
  ];

  return <PublicMetaRail items={items} />;
}

function QuestionIndexList({ fields }: { fields: AnalysisField[] }) {
  return (
    <ol className="grid">
      {fields.map((field, index) => (
        <li key={field.id} className="border-b border-foreground/20 last:border-b-0">
          <a
            href={`#${getAnalysisFieldAnchorId(field.id)}`}
            className={cn("flex gap-3 py-2.5 text-foreground hover:text-accent", focusRing)}
          >
            <span className="shrink-0 font-heading text-[13px] leading-[1.3] font-black text-accent tabular-nums">
              {formatQuestionNumber(index)}
            </span>
            <span className="min-w-0 font-ui text-[13px] leading-[1.3] font-bold">
              {field.label}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Index of the questions: collapsible on small screens, sticky sidebar from `lg`. */
function QuestionIndex({ fields }: { fields: AnalysisField[] }) {
  return (
    <>
      <details className="border-y border-foreground lg:hidden">
        <summary
          className={cn(
            publicTypography.label,
            "flex min-h-12 cursor-pointer items-center justify-between gap-4 text-foreground",
            focusRing,
          )}
        >
          {text.resultsPage.indexTitle}
          <span className="font-heading text-[13px] font-black text-accent tabular-nums">
            {fields.length}
          </span>
        </summary>
        <nav aria-label={text.resultsPage.indexNavAriaLabel} className="pb-3">
          <QuestionIndexList fields={fields} />
        </nav>
      </details>
      <nav
        aria-label={text.resultsPage.indexNavAriaLabel}
        className="sticky top-[calc(var(--public-header-height)+var(--space-4))] hidden max-h-[calc(100svh-var(--public-header-height)-var(--space-4)*2)] self-start overflow-y-auto border-t-2 border-foreground pt-4 lg:block"
      >
        <h2 className={cn(publicTypography.label, "mb-2 text-foreground")}>
          {text.resultsPage.indexTitle}
        </h2>
        <QuestionIndexList fields={fields} />
      </nav>
    </>
  );
}

function QuestionResults({
  field,
  index,
  total,
}: {
  field: AnalysisField;
  index: number;
  total: number;
}) {
  const anchorId = getAnalysisFieldAnchorId(field.id);

  return (
    <section
      aria-labelledby={anchorId}
      className="grid min-w-0 gap-5 border-t border-foreground py-8 first:border-t-0 first:pt-0 md:py-12"
    >
      <AnalysisFieldResults field={field} index={index} total={total} />
      <p>
        <a
          href={`#${anchorId}`}
          aria-label={text.resultsPage.questionLinkAriaLabel(field.label)}
          className={cn(
            "font-ui text-[11px] font-bold tracking-[0.03em] text-muted uppercase underline underline-offset-4 hover:text-accent",
            focusRing,
          )}
        >
          {text.resultsPage.questionLinkLabel}
        </a>
      </p>
    </section>
  );
}

export function PublicQuestionnaireResultsPage({
  analysis,
}: {
  analysis: PublicQuestionnaireAnalysisDto;
}) {
  const description = extractPlainText(analysis.descriptionRich);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <article data-questionnaire-id={analysis.id}>
        <PublicPageHero
          as="header"
          title={analysis.title}
          titleStyled={analysis.titleStyled}
          eyebrow={
            <p className={cn(publicTypography.kicker, "text-accent")}>{text.resultsPage.eyebrow}</p>
          }
          description={description || undefined}
          meta={<ResultsMetaRail analysis={analysis} />}
        />
        <div
          className={cn(
            publicContentClassName,
            "grid gap-8 border-t-2 border-foreground py-8 lg:grid-cols-[minmax(220px,1fr)_minmax(0,3fr)] lg:gap-12 lg:py-12",
          )}
        >
          <QuestionIndex fields={analysis.fields} />
          <div className="min-w-0">
            <h2 className="sr-only">{text.resultsPage.resultsHeading}</h2>
            {analysis.fields.map((field, index) => (
              <QuestionResults
                key={field.id}
                field={field}
                index={index}
                total={analysis.fields.length}
              />
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
