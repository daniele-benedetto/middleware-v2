"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { courseVariantClasses } from "@/components/public/course-variant";
import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { PublicLink } from "@/components/public/public-link";
import { AnalysisFieldResults } from "@/components/public/sections/questionnaires/analysis-field-results";
import {
  formatAnalysisClosedDate,
  formatQuestionNumber,
  getAnalysisFieldAnchorId,
  getQuestionnaireResultsPath,
} from "@/components/public/sections/questionnaires/analysis-format";
import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";
import { extractPlainText } from "@/lib/rich-text/plain-text";
import { cn } from "@/lib/utils";

import type { QuestionnaireAnalysisHomeBlock as QuestionnaireAnalysisHomeBlockData } from "@/components/public/home/home-view-model";
import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

const questionNumberClass =
  "shrink-0 font-heading text-[13px] leading-[1.2] font-black tabular-nums";
const questionLabelClass = "min-w-0 font-ui leading-[1.3] font-bold tracking-[0.03em] uppercase";

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isElementVisible(element: HTMLElement) {
  return element.getClientRects().length > 0;
}

function MobileQuestionMenu({
  fields,
  activeIndex,
  title,
  onSelect,
}: {
  fields: AnalysisField[];
  activeIndex: number;
  title: string;
  onSelect: (index: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeField = fields[activeIndex];
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  function closeMenu() {
    if (!visible) return;
    setOpen(false);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setVisible(false);
      buttonRef.current?.focus({ preventScroll: true });
    }, 180);
  }

  const closeMenuFromEffect = useEffectEvent(closeMenu);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const previousOverflow = document.body.style.overflow;
    const inertElements = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-public-header], [data-public-page-content], [data-public-footer]",
      ),
    );
    document.body.style.overflow = "hidden";
    inertElements.forEach((element) => {
      element.inert = true;
    });
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeMenuFromEffect();
    }

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      const dialog = document.getElementById(menuId);
      const focusableElements = Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter(isElementVisible);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      inertElements.forEach((element) => {
        element.inert = false;
      });
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("keydown", trapFocus);
    };
  }, [menuId, visible]);

  function openMenu() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    setVisible(true);
    window.requestAnimationFrame(() => setOpen(true));
  }

  if (!activeField) return null;

  return (
    <div className="border-b border-foreground bg-background md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-controls={menuId}
        aria-expanded={visible}
        aria-label={i18n.public.questionnaireAnalysis.selectQuestionAriaLabel}
        onClick={openMenu}
        className={cn(
          publicInteraction.cardSurface,
          "flex min-h-16 w-full items-center justify-between gap-4 px-4 py-4 text-left text-foreground focus-visible:outline-offset-[-3px] sm:px-6",
        )}
      >
        <span className="flex min-w-0 items-baseline gap-3">
          <span aria-hidden="true" className={cn(questionNumberClass, "text-accent")}>
            {formatQuestionNumber(activeIndex)}
          </span>
          <span className={cn(questionLabelClass, "line-clamp-2 text-[11px]")}>
            {activeField.label}
          </span>
        </span>
        <span className="flex size-9 items-center justify-center" aria-hidden="true">
          <Menu size={26} strokeWidth={2.5} />
        </span>
      </button>
      {visible
        ? createPortal(
            <div
              aria-label={i18n.public.questionnaireAnalysis.selectionDialogAriaLabel}
              aria-modal="true"
              className={cn(
                "fixed inset-0 z-120 flex flex-col border-l border-foreground bg-background text-foreground transition-transform duration-180 ease-out",
                open ? "translate-x-0" : "translate-x-full",
              )}
              id={menuId}
              role="dialog"
            >
              <header className="flex min-h-16 items-center justify-between gap-4 border-b-2 border-foreground px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6">
                <h2 className="line-clamp-2 min-w-0 font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em]">
                  {title}
                </h2>
                <button
                  type="button"
                  ref={closeButtonRef}
                  onClick={closeMenu}
                  aria-label={i18n.public.questionnaireAnalysis.closeQuestionsAriaLabel}
                  className="flex size-9 cursor-pointer items-center justify-center focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <X size={26} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </header>
              <nav
                aria-label={i18n.public.questionnaireAnalysis.questionsListAriaLabel}
                className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
              >
                {fields.map((field, index) => (
                  <button
                    className={cn(
                      publicInteraction.cardSurface,
                      "relative flex min-h-16 w-full items-baseline gap-3 border-b border-b-foreground border-l border-l-transparent px-4 py-5 text-left last:border-b-0 focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px] sm:px-6",
                      index === activeIndex
                        ? "border-l-accent bg-surface-hover text-foreground"
                        : "bg-background text-foreground",
                    )}
                    key={field.id}
                    type="button"
                    aria-current={index === activeIndex ? "true" : undefined}
                    data-field-id={field.id}
                    onClick={() => {
                      onSelect(index);
                      closeMenu();
                    }}
                  >
                    <span aria-hidden="true" className={cn(questionNumberClass, "text-accent")}>
                      {formatQuestionNumber(index)}
                    </span>
                    <span className={cn(questionLabelClass, "text-[12px]")}>{field.label}</span>
                  </button>
                ))}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function QuestionList({
  fields,
  activeIndex,
  onSelect,
}: {
  fields: AnalysisField[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <aside className="hidden min-h-0 flex-col bg-background md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/3 md:border-r md:border-foreground">
      <nav
        aria-label={i18n.public.questionnaireAnalysis.questionsNavAriaLabel}
        className="flex min-h-0 flex-1 overflow-x-auto md:flex-col md:overflow-y-auto"
      >
        {fields.map((field, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => onSelect(index)}
              aria-current={selected ? "true" : undefined}
              data-field-id={field.id}
              className={cn(
                publicInteraction.cardSurface,
                "relative flex min-w-55 items-baseline gap-3 border-b border-r border-b-foreground border-r-foreground px-6 py-5 text-left last:border-r-0 last:border-b-0 md:min-w-0 md:border-x-0 md:px-8 md:py-6",
                selected
                  ? "bg-surface-hover text-foreground shadow-(--interactive-rail-shadow)"
                  : "bg-background text-foreground",
              )}
            >
              <span aria-hidden="true" className={cn(questionNumberClass, "text-accent")}>
                {formatQuestionNumber(index)}
              </span>
              <span className={cn(questionLabelClass, "line-clamp-6 text-[12px]")}>
                {field.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function QuestionCanvas({
  field,
  index,
  total,
  announcement,
}: {
  field: AnalysisField;
  index: number;
  total: number;
  announcement: string;
}) {
  return (
    <section
      aria-labelledby={getAnalysisFieldAnchorId(field.id)}
      className="min-w-0 p-4 sm:p-6 md:col-start-2 md:p-8 lg:p-10"
    >
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <AnalysisFieldResults key={field.id} field={field} index={index} total={total} />
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
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, analysis.fields.length - 1));
  const activeField = analysis.fields[safeActiveIndex];
  const description = extractPlainText(analysis.descriptionRich);
  const variant = courseVariantClasses[analysis.homeVariant];
  // Empty until the reader picks a question, so the live region only speaks on change.
  const [announcement, setAnnouncement] = useState("");

  function selectQuestion(index: number) {
    const field = analysis.fields[index];
    if (!field) return;
    setActiveIndex(index);
    setAnnouncement(i18n.public.questionnaireAnalysis.resultsAriaLabel(field.label));
  }

  if (!activeField) return null;

  return (
    <section
      className="scroll-mt-[var(--public-issue-anchor-offset)] py-10 md:py-12"
      data-questionnaire-id={analysis.id}
    >
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div className="overflow-hidden border-y border-foreground md:border">
          <header
            className={cn(variant.surface, variant.border, "border-b p-4 sm:p-6 md:p-8 lg:p-10")}
          >
            <h2
              className={cn(
                publicTypography.featureArticleTitle,
                variant.title,
                "w-full max-w-none",
              )}
            >
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
            <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className={cn(publicTypography.smallKicker, variant.meta)}>
                {i18n.public.questionnaireAnalysis.closedOn(
                  formatAnalysisClosedDate(analysis.closedAt),
                )}
              </p>
              {analysis.slug ? (
                <PublicLink
                  href={getQuestionnaireResultsPath(analysis.slug)}
                  className={cn(
                    publicTypography.smallKicker,
                    variant.title,
                    "inline-flex items-center gap-2 underline decoration-2 underline-offset-4 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-current",
                  )}
                >
                  {i18n.public.questionnaireAnalysis.allResultsCta}
                  <ArrowRight aria-hidden className="size-3.5" />
                </PublicLink>
              ) : null}
            </div>
          </header>
          <div className="relative grid md:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
            <MobileQuestionMenu
              fields={analysis.fields}
              activeIndex={safeActiveIndex}
              title={analysis.title}
              onSelect={selectQuestion}
            />
            <QuestionList
              fields={analysis.fields}
              activeIndex={safeActiveIndex}
              onSelect={selectQuestion}
            />
            <QuestionCanvas
              field={activeField}
              index={safeActiveIndex}
              total={analysis.fields.length}
              announcement={announcement}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
