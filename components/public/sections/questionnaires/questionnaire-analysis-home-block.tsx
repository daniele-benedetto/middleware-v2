"use client";

import { useRef, useState } from "react";

import { courseVariantClasses } from "@/components/public/course-variant";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { QuestionnaireFieldChart } from "@/components/public/sections/questionnaires/charts/questionnaire-field-chart";
import { StyledTitle } from "@/components/public/styled-title";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { cn } from "@/lib/utils";

import type { QuestionnaireAnalysisHomeBlock as QuestionnaireAnalysisHomeBlockData } from "@/components/public/home/home-view-model";
import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

function QuestionList({
  fields,
  activeIndex,
  onSelect,
}: {
  fields: AnalysisField[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const listRef = useRef<HTMLElement>(null);

  function selectQuestion(index: number, item: HTMLButtonElement) {
    const list = listRef.current;
    if (list) {
      const listBounds = list.getBoundingClientRect();
      const itemBounds = item.getBoundingClientRect();
      list.scrollTo({
        top: list.scrollTop + itemBounds.top - listBounds.top,
        left: list.scrollLeft + itemBounds.left - listBounds.left,
        behavior: "smooth",
      });
    }

    onSelect(index);
  }

  return (
    <aside className="flex min-h-0 flex-col bg-background md:border-r md:border-foreground">
      <nav
        aria-label="Domande del questionario"
        ref={listRef}
        className="flex min-h-0 flex-1 overflow-x-auto md:flex-col md:overflow-y-auto"
      >
        {fields.map((field, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={field.id}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectQuestion(index, event.currentTarget);
              }}
              aria-current={selected ? "true" : undefined}
              className={cn(
                publicInteraction.cardSurface,
                "relative min-w-55 border-b border-r border-foreground px-5 py-5 text-left last:border-r-0 sm:px-6 md:min-w-0 md:border-x-0 md:px-7 md:py-6",
                selected
                  ? "bg-surface-hover text-foreground shadow-(--interactive-rail-shadow)"
                  : "bg-background text-foreground",
              )}
            >
              <span className="line-clamp-3 block font-ui text-[11px] leading-[1.25] font-bold tracking-[0.03em] uppercase">
                {field.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function QuestionCanvas({ field }: { field: AnalysisField }) {
  return (
    <section
      aria-label={`Risultati: ${field.label}`}
      className="flex min-w-0 flex-col overflow-y-auto p-5 sm:p-7 md:p-8 lg:p-10"
    >
      <div className="min-h-80 flex-1 py-2">
        <QuestionnaireFieldChart field={field} />
      </div>
    </section>
  );
}

export function QuestionnaireAnalysisHomeBlock({
  block,
}: {
  block: QuestionnaireAnalysisHomeBlockData;
}) {
  const analysis = block.questionnaireAnalysis;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeField = analysis.fields[activeIndex];
  const description = extractPlainText(analysis.descriptionRich);
  const variant = courseVariantClasses[analysis.homeVariant];

  if (!activeField) return null;

  return (
    <section className="scroll-mt-20 py-10 md:py-12">
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div className="overflow-hidden border-y border-foreground md:border">
          <header className={cn(variant.surface, "p-6 md:p-8 lg:p-10")}>
            <h2 className={cn(publicTypography.featureArticleTitle, variant.title, "max-w-[16ch]")}>
              <StyledTitle
                title={analysis.title}
                titleStyled={analysis.titleStyled}
                primaryClassName={variant.titlePrimary}
              />
            </h2>
            {description ? (
              <p
                className={cn(
                  "mt-5 w-full",
                  publicTypography.dossierDescription,
                  variant.description,
                )}
              >
                {description}
              </p>
            ) : null}
          </header>
          <div className="grid min-h-140 md:h-[42rem] md:min-h-0 md:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <QuestionList
              fields={analysis.fields}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />
            <QuestionCanvas field={activeField} />
          </div>
        </div>
      </div>
    </section>
  );
}
