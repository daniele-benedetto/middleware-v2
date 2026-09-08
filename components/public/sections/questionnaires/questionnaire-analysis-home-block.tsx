"use client";

import { ArrowLeft, ArrowRight, BarChart3, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { PublicRichText } from "@/components/public/rich-text";
import { cn } from "@/lib/utils";

import type { QuestionnaireAnalysisHomeBlock as QuestionnaireAnalysisHomeBlockData } from "@/components/public/home/home-view-model";
import type { PublicQuestionnaireAnalysisDto } from "@/lib/server/modules/questionnaires/dto/public";

type AnalysisField = PublicQuestionnaireAnalysisDto["fields"][number];

function formatNumber(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(new Date(value))
    : "—";
}

function Bar({ value, label, detail }: { value: number; label: string; detail: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4 font-ui text-[10px] font-bold tracking-[0.06em] uppercase">
        <span className="min-w-0 text-foreground">{label}</span>
        <span className="shrink-0 text-muted">{detail}</span>
      </div>
      <div className="h-3 bg-foreground/12" aria-hidden>
        <div
          className="h-full bg-accent"
          style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
        />
      </div>
    </div>
  );
}

function FieldChart({ field, expanded = false }: { field: AnalysisField; expanded?: boolean }) {
  if (field.kind === "choice") {
    const options = [...field.options].sort((left, right) => right.count - left.count);
    return (
      <div className={cn("space-y-4", !expanded && "max-h-48 overflow-hidden")}>
        {options.map((option) => (
          <Bar
            key={option.label}
            label={option.label}
            value={option.percentage}
            detail={`${formatNumber(option.percentage)}% · ${option.count}`}
          />
        ))}
      </div>
    );
  }

  if (field.kind === "boolean") {
    const total = field.trueCount + field.falseCount;
    const truePercentage = total === 0 ? 0 : (field.trueCount / total) * 100;
    return (
      <div className="space-y-4">
        <div
          className="flex h-8 overflow-hidden border border-foreground"
          aria-label={`${field.trueLabel}: ${field.trueCount}; ${field.falseLabel}: ${field.falseCount}`}
        >
          <div
            className="flex items-center justify-center bg-foreground font-ui text-[10px] font-bold text-background"
            style={{ width: `${truePercentage}%` }}
          >
            {truePercentage > 12 ? `${formatNumber(truePercentage)}%` : null}
          </div>
          <div className="flex flex-1 items-center justify-center bg-card font-ui text-[10px] font-bold text-foreground">
            {100 - truePercentage > 12 ? `${formatNumber(100 - truePercentage)}%` : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 font-ui text-[10px] font-bold tracking-[0.06em] uppercase">
          <span>
            {field.trueLabel}: <strong className="text-accent">{field.trueCount}</strong>
          </span>
          <span className="text-right">
            {field.falseLabel}: {field.falseCount}
          </span>
        </div>
      </div>
    );
  }

  if (field.kind === "number") {
    const peak = Math.max(...field.distribution.map((item) => item.count), 1);
    return (
      <div>
        {field.distribution.length > 0 ? (
          <div
            className="flex h-28 items-end gap-px border-b border-foreground"
            aria-label="Distribuzione delle risposte"
          >
            {field.distribution.map((item) => (
              <div
                key={item.value}
                className="group relative flex min-w-0 flex-1 flex-col justify-end"
              >
                <div className="bg-accent" style={{ height: `${(item.count / peak) * 100}%` }} />
                <span className="mt-2 truncate text-center font-ui text-[9px] font-bold text-muted">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-editorial text-[16px] text-muted">Nessuna risposta disponibile.</p>
        )}
        <div className="mt-6 grid grid-cols-3 border-l border-t border-foreground">
          <Metric label="Min." value={formatNumber(field.minimum)} />
          <Metric label="Media" value={formatNumber(field.average)} accent />
          <Metric label="Max." value={formatNumber(field.maximum)} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 border-l border-t border-foreground">
      <Metric label="Prima risposta" value={formatDate(field.minimum)} />
      <Metric label="Ultima risposta" value={formatDate(field.maximum)} accent />
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-r border-b border-foreground p-3">
      <p className="font-ui text-[9px] font-bold tracking-[0.08em] text-muted uppercase">{label}</p>
      <p
        className={cn(
          "mt-2 font-heading text-[clamp(18px,2vw,26px)] leading-none font-black tracking-[-0.03em]",
          accent && "text-accent",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FieldCard({
  field,
  index,
  onInspect,
}: {
  field: AnalysisField;
  index: number;
  onInspect: () => void;
}) {
  const titleId = `questionnaire-analysis-field-${field.id}`;
  return (
    <article className="flex min-w-0 flex-col border-r border-b border-foreground bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="pt-1 font-ui text-[11px] font-black text-accent">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div>
          <h3
            id={titleId}
            className="font-heading text-[clamp(21px,2.1vw,29px)] leading-[1.02] font-black tracking-[-0.03em] text-foreground"
          >
            {field.label}
          </h3>
          {field.description ? (
            <p className="mt-2 font-editorial text-[15px] leading-relaxed text-muted">
              {field.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-7 flex-1 pl-7 sm:pl-8">
        <FieldChart field={field} />
      </div>
      <div className="mt-7 flex items-center justify-between gap-4 border-t border-foreground pt-4 pl-7 sm:pl-8">
        <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
          {field.responseCount} risposte
        </p>
        <button
          type="button"
          onClick={onInspect}
          aria-labelledby={titleId}
          className="font-ui text-[10px] font-bold tracking-[0.08em] text-accent uppercase transition-colors hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Esplora dati
        </button>
      </div>
    </article>
  );
}

function AnalysisDetail({
  fields,
  activeIndex,
  onClose,
  onSelect,
}: {
  fields: AnalysisField[];
  activeIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const dialogId = useId();
  const field = fields[activeIndex];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && activeIndex > 0) onSelect(activeIndex - 1);
      if (event.key === "ArrowRight" && activeIndex < fields.length - 1) onSelect(activeIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, fields.length, onClose, onSelect]);
  if (!field) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-stretch bg-background p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogId}
    >
      <div className="flex min-h-0 w-full flex-col border-t-[3px] border-accent bg-card p-5 sm:p-8">
        <div className="flex items-start justify-between gap-5 border-b border-foreground pb-5">
          <div>
            <p className="font-ui text-[10px] font-bold tracking-[0.1em] text-accent uppercase">
              Domanda {activeIndex + 1} di {fields.length}
            </p>
            <h3
              id={dialogId}
              className="mt-3 font-heading text-[clamp(26px,3.3vw,44px)] leading-[0.96] font-black tracking-[-0.04em]"
            >
              {field.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center border border-foreground bg-card hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Chiudi dettaglio dati"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {field.description ? (
          <p className="mt-5 font-editorial text-[17px] leading-relaxed text-body-text">
            {field.description}
          </p>
        ) : null}
        <div className="cms-scroll min-h-0 flex-1 overflow-y-auto py-8">
          <FieldChart field={field} expanded />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-foreground pt-5">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => onSelect(activeIndex - 1)}
            className="inline-flex items-center gap-2 font-ui text-[10px] font-bold tracking-[0.08em] uppercase disabled:text-muted"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Prec.
          </button>
          <p className="font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
            {field.responseCount} risposte
          </p>
          <button
            type="button"
            disabled={activeIndex === fields.length - 1}
            onClick={() => onSelect(activeIndex + 1)}
            className="inline-flex items-center gap-2 font-ui text-[10px] font-bold tracking-[0.08em] uppercase disabled:text-muted"
          >
            Succ.
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestionnaireAnalysisHomeBlock({
  block,
}: {
  block: QuestionnaireAnalysisHomeBlockData;
}) {
  const analysis = block.questionnaireAnalysis;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  return (
    <section className="scroll-mt-20 py-10 md:py-12">
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div className="relative overflow-hidden border-y border-foreground bg-background md:border">
          <div className="grid md:grid-cols-[minmax(260px,0.34fr)_minmax(0,0.66fr)]">
            <header className="border-b border-foreground p-6 md:border-r md:border-b-0 md:p-8 lg:p-10">
              <p className="font-ui text-[11px] font-extrabold tracking-[0.12em] text-accent uppercase">
                Restituzione del questionario
              </p>
              <h2 className="mt-5 font-heading text-[clamp(34px,4.2vw,68px)] leading-[0.9] font-black tracking-[-0.05em] text-foreground">
                {analysis.title}
              </h2>
              {analysis.descriptionRich ? (
                <PublicRichText value={analysis.descriptionRich} className="mt-6 text-[17px]" />
              ) : null}
              <div className="mt-9 grid border-l border-t border-foreground sm:grid-cols-2 md:grid-cols-1">
                <Metric label="Risposte raccolte" value={String(analysis.responseCount)} accent />
                <Metric label="Domande analizzate" value={String(analysis.fields.length)} />
              </div>
              <p className="mt-6 flex items-center gap-2 font-ui text-[10px] font-bold tracking-[0.08em] text-muted uppercase">
                <BarChart3 className="size-3.5 text-accent" aria-hidden />
                Dati aggregati · Questionario chiuso
              </p>
            </header>
            <div className="grid min-w-0 border-l border-t border-foreground md:border-l-0 md:border-t-0 lg:grid-cols-2">
              {analysis.fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  index={index}
                  onInspect={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>
          {activeIndex !== null ? (
            <AnalysisDetail
              fields={analysis.fields}
              activeIndex={activeIndex}
              onClose={() => setActiveIndex(null)}
              onSelect={setActiveIndex}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
