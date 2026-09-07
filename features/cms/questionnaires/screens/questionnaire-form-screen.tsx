"use client";

import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClipboardList, GripVertical, Plus, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type HTMLAttributes, type ReactNode } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsMetaText,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsSelect,
  CmsStyledTitleEditor,
  CmsTextInput,
  CmsTextarea,
  cmsToast,
  createStyledTitleValue,
  getStyledTitlePlainText,
  hasStyledTitleFormatting,
} from "@/components/cms/primitives";
import {
  useQuestionnaireById,
  useQuestionnaireCreate,
  useQuestionnaireUpdate,
  type QuestionnaireDetail,
} from "@/features/cms/questionnaires/hooks/use-questionnaire-crud";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { useSortableSensors } from "@/features/cms/shared/hooks/use-sortable-sensors";
import { cmsCrudRoutes } from "@/lib/cms/crud-routes";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  createQuestionnaireInputSchema,
  updateQuestionnaireInputSchema,
  type QuestionnaireCopy,
  type QuestionnaireDefinition,
  type QuestionnaireField,
} from "@/lib/server/modules/questionnaires/schema";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { normalizeSlug } from "@/lib/validation/slug";

import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";

const fieldTypes = [
  "text",
  "textarea",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "email",
  "phone",
  "url",
  "singleChoice",
  "multipleChoice",
  "scale",
  "consent",
  "information",
] as const;
type FieldType = (typeof fieldTypes)[number];

const emptyCopy: QuestionnaireCopy = {
  progressLabel: "Avanzamento",
  backLabel: "Indietro",
  nextLabel: "Avanti",
  submitLabel: "Invia",
  requiredFieldsMessage: "Compila i campi obbligatori.",
  resumeMessage: "Riprendi dove avevi interrotto.",
  successTitle: "Grazie",
  successMessage: "La risposta e stata registrata.",
  alreadySubmittedTitle: "Risposta gia inviata",
  alreadySubmittedMessage: "Hai gia completato questo questionario.",
  closedTitle: "Questionario chiuso",
  closedMessage: "Questo questionario non accetta piu risposte.",
  resultsTitle: "Risultati",
  resultsEmptyMessage: "Non ci sono ancora risultati da mostrare.",
};

function newField(type: FieldType): QuestionnaireField {
  const base = {
    id: crypto.randomUUID(),
    label: "Nuova domanda",
    required: false,
    publicResults: false,
  };
  if (type === "singleChoice" || type === "multipleChoice")
    return { ...base, type, options: [{ id: crypto.randomUUID(), label: "Opzione" }] };
  if (type === "boolean") return { ...base, type, trueLabel: "Si", falseLabel: "No" };
  if (type === "scale") return { ...base, type, min: 1, max: 5 };
  if (type === "consent") return { ...base, type, consentText: "Acconsento" };
  return { ...base, type } as QuestionnaireField;
}

function emptyDefinition(): QuestionnaireDefinition {
  return {
    version: 1,
    copy: emptyCopy,
    steps: [{ id: crypto.randomUUID(), title: "Step 1", fields: [] }],
  };
}

type Props = {
  mode: "create" | "edit";
  questionnaireId?: string;
  initialData?: QuestionnaireDetail;
};

export function CmsQuestionnaireFormScreen({ mode, questionnaireId, initialData }: Props) {
  const query = useQuestionnaireById(mode === "edit" ? questionnaireId : undefined, {
    initialData,
  });
  const create = useQuestionnaireCreate();
  const update = useQuestionnaireUpdate();
  const { cancel, success } = useCmsFormNavigation("/cms/questionari");
  const text = i18n.cms.forms.resources.questionnaires;
  const utils = trpc.useUtils();

  if (mode === "edit" && !questionnaireId)
    return (
      <CmsErrorState
        title={text.invalidTitle}
        description={i18n.cms.forms.invalidEditIdDescription}
      />
    );
  if (mode === "edit" && query.isPending) return <CmsLoadingState />;
  if (mode === "edit" && query.isError) {
    const error = mapCrudDomainError(query.error, "questionnaires");
    return <CmsErrorState title={error.title} description={error.description} />;
  }

  return (
    <QuestionnaireFormContent
      mode={mode}
      questionnaireId={questionnaireId}
      questionnaire={query.data}
      busy={create.isPending || update.isPending}
      onCancel={cancel}
      onSave={async (data) => {
        try {
          if (mode === "create") {
            const result = validateFormInput(createQuestionnaireInputSchema, data, {
              title: text.title,
              slug: i18n.cms.forms.fields.slug,
              definition: text.definition,
            });
            if (!result.ok) throw new Error(result.message);
            await create.mutateAsync(result.value);
            await invalidateAfterCmsMutation(utils, "questionnaires.create");
            success(text.created);
          } else {
            const result = validateFormInput(updateQuestionnaireInputSchema, data, {
              title: text.title,
              slug: i18n.cms.forms.fields.slug,
              definition: text.definition,
            });
            if (!result.ok) throw new Error(result.message);
            await update.mutateAsync({ id: questionnaireId!, data: result.value });
            await invalidateAfterCmsMutation(utils, "questionnaires.update", {
              id: questionnaireId,
            });
            success(text.updated);
          }
        } catch (error) {
          const mapped = mapCrudDomainError(error, "questionnaires");
          cmsToast.error(mapped.description, mapped.title);
        }
      }}
    />
  );
}

function QuestionnaireFormContent({
  mode,
  questionnaireId,
  questionnaire,
  busy,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  questionnaireId?: string;
  questionnaire?: QuestionnaireDetail;
  busy: boolean;
  onCancel: () => void;
  onSave: (data: {
    title: string;
    titleStyled: IssueTitleStyled | null;
    slug: string;
    descriptionRich: unknown | null;
    definition: QuestionnaireDefinition;
  }) => Promise<void>;
}) {
  const router = useRouter();
  const text = i18n.cms.forms.resources.questionnaires;
  const [titleStyled, setTitleStyled] = useState<IssueTitleStyled>(() =>
    createStyledTitleValue(questionnaire?.title ?? "", questionnaire?.titleStyled),
  );
  const [descriptionRich, setDescriptionRich] = useState<unknown>(
    questionnaire?.descriptionRich ?? null,
  );
  const [definition, setDefinition] = useState<QuestionnaireDefinition>(
    questionnaire?.definition ?? emptyDefinition,
  );
  const locked = Boolean(questionnaire?.firstResponseAt);
  const sensors = useSortableSensors();
  const updateDefinition = (
    transform: (value: QuestionnaireDefinition) => QuestionnaireDefinition,
  ) => setDefinition(transform);
  const title = getStyledTitlePlainText(titleStyled);
  const initialAutoSlug = useMemo(
    () => normalizeSlug(questionnaire?.title ?? ""),
    [questionnaire?.title],
  );
  const [manualSlug, setManualSlug] = useState(questionnaire?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(questionnaire?.slug) && questionnaire?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);
  const automaticSlug = useMemo(() => normalizeSlug(title), [title]);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : automaticSlug;
  const slugPreview = resolvedSlug || text.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? text.slugManualHint
    : i18n.cms.forms.generatedFromTitleHint;
  const openSlugEditor = () => {
    setManualSlug(resolvedSlug);
    setIsSlugEditing(true);
  };
  const regenerateSlugFromTitle = () => {
    setManualSlug(automaticSlug);
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };
  const updateCopy = (key: keyof QuestionnaireCopy, value: string) =>
    updateDefinition((current) => ({ ...current, copy: { ...current.copy, [key]: value } }));
  const updateField = (
    stepIndex: number,
    fieldIndex: number,
    transform: (field: QuestionnaireField) => QuestionnaireField,
  ) =>
    updateDefinition((current) => ({
      ...current,
      steps: current.steps.map((step, index) =>
        index === stepIndex
          ? {
              ...step,
              fields: step.fields.map((field, fieldIdx) =>
                fieldIdx === fieldIndex ? transform(field) : field,
              ),
            }
          : step,
      ),
    }));
  const move = <T,>(items: T[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return items;
    const copy = [...items];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
  };
  const handleStepDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const oldIndex = definition.steps.findIndex((step) => step.id === activeId);
    const newIndex = definition.steps.findIndex((step) => step.id === overId);
    if (oldIndex >= 0 && newIndex >= 0) {
      updateDefinition((current) => ({
        ...current,
        steps: arrayMove(current.steps, oldIndex, newIndex),
      }));
      return;
    }

    const parseFieldId = (id: string) => {
      const match = /^field:([^:]+):([^:]+)$/.exec(id);
      return match ? { stepId: match[1], fieldId: match[2] } : null;
    };
    const activeField = parseFieldId(activeId);
    const overField = parseFieldId(overId);
    if (!activeField || !overField) return;

    updateDefinition((current) => {
      const sourceStepIndex = current.steps.findIndex((step) => step.id === activeField.stepId);
      const targetStepIndex = current.steps.findIndex((step) => step.id === overField.stepId);
      if (sourceStepIndex < 0 || targetStepIndex < 0) return current;
      const sourceStep = current.steps[sourceStepIndex];
      const targetStep = current.steps[targetStepIndex];
      const sourceFieldIndex = sourceStep.fields.findIndex(
        (field) => field.id === activeField.fieldId,
      );
      const targetFieldIndex = targetStep.fields.findIndex(
        (field) => field.id === overField.fieldId,
      );
      if (sourceFieldIndex < 0 || targetFieldIndex < 0) return current;
      if (sourceStepIndex === targetStepIndex) {
        return {
          ...current,
          steps: current.steps.map((step, index) =>
            index === sourceStepIndex
              ? { ...step, fields: arrayMove(step.fields, sourceFieldIndex, targetFieldIndex) }
              : step,
          ),
        };
      }
      const movingField = sourceStep.fields[sourceFieldIndex];
      return {
        ...current,
        steps: current.steps.map((step, index) => {
          if (index === sourceStepIndex)
            return {
              ...step,
              fields: step.fields.filter((_, fieldIndex) => fieldIndex !== sourceFieldIndex),
            };
          if (index === targetStepIndex)
            return {
              ...step,
              fields: [
                ...step.fields.slice(0, targetFieldIndex),
                movingField,
                ...step.fields.slice(targetFieldIndex),
              ],
            };
          return step;
        }),
      };
    });
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({
          title,
          titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
          slug: resolvedSlug,
          descriptionRich,
          definition,
        });
      }}
    >
      <CmsPageHeader
        title={mode === "create" ? text.createTitle : text.editTitle}
        actions={
          <div className="flex gap-2">
            {mode === "edit" && questionnaireId ? (
              <CmsActionButton
                type="button"
                variant="outline"
                onClick={() => router.push(cmsCrudRoutes.questionnaires.responses(questionnaireId))}
                disabled={busy}
              >
                <ClipboardList aria-hidden />
                {text.viewResponses}
              </CmsActionButton>
            ) : null}
            <CmsActionButton variant="outline" onClick={onCancel} disabled={busy}>
              <X aria-hidden />
              {i18n.cms.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={busy}>
              {mode === "create" ? <Plus aria-hidden /> : <Save aria-hidden />}
              {mode === "create" ? i18n.cms.forms.create : i18n.cms.forms.save}
            </CmsActionButton>
          </div>
        }
      />
      <div className="cms-scroll grid min-h-0 flex-1 gap-6 overflow-y-auto pb-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:pr-1">
        <div className="space-y-6">
          <CmsFormField
            label={text.title}
            htmlFor="questionnaire-title"
            hint={text.titleStyledHint}
            required
          >
            <CmsStyledTitleEditor
              id="questionnaire-title"
              value={titleStyled}
              onChange={setTitleStyled}
              placeholder={text.title}
              accentLabel={text.titleStyledAccentAction}
              lineBreakLabel={text.titleStyledLineBreakAction}
              ariaLabel={text.titleStyledEditorAriaLabel}
            />
          </CmsFormField>
          <input type="hidden" name="title" value={title} />
          <CmsFormField
            label={i18n.cms.forms.fields.slug}
            htmlFor="questionnaire-slug"
            hint={slugHint}
          >
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <CmsTextInput
                  id="questionnaire-slug"
                  className="flex-1"
                  value={manualSlug}
                  autoFocus
                  onBlur={() => setIsSlugEditing(false)}
                  onChange={(event) => {
                    setManualSlug(event.target.value);
                    setHasManualSlugOverride(true);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={openSlugEditor}
                  className={cn(
                    "flex h-10 flex-1 items-center rounded-[6px] border border-foreground bg-card px-3 text-left",
                    "font-ui text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-surface-hover",
                    resolvedSlug ? "text-foreground" : "text-border",
                  )}
                >
                  {slugPreview}
                </button>
              )}
              <button
                type="button"
                onClick={regenerateSlugFromTitle}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center rounded-[6px] border border-foreground bg-card px-3",
                  "font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-surface-hover",
                )}
              >
                {i18n.cms.forms.regenerateSlug}
              </button>
            </div>
          </CmsFormField>
          <CmsFormField label={text.description} htmlFor="questionnaire-description">
            <CmsRichTextEditor
              value={descriptionRich}
              onChange={setDescriptionRich}
              ariaLabel={text.description}
            />
          </CmsFormField>
          <section className="space-y-4 border-t border-foreground pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CmsMetaText variant="category">{text.steps}</CmsMetaText>
              <CmsActionButton
                type="button"
                size="xs"
                variant="outline"
                disabled={locked}
                onClick={() =>
                  updateDefinition((current) => ({
                    ...current,
                    steps: [
                      ...current.steps,
                      {
                        id: crypto.randomUUID(),
                        title: `Step ${current.steps.length + 1}`,
                        fields: [],
                      },
                    ],
                  }))
                }
              >
                <Plus aria-hidden />
                {text.addStep}
              </CmsActionButton>
            </div>
            {locked ? (
              <p className="rounded border border-foreground bg-surface p-3 text-sm">
                {text.locked}
              </p>
            ) : null}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleStepDragEnd}
            >
              <SortableContext
                items={definition.steps.map((step) => step.id)}
                strategy={verticalListSortingStrategy}
              >
                {definition.steps.map((step, stepIndex) => (
                  <SortableStepCard key={step.id} id={step.id} disabled={locked}>
                    {(dragHandleProps) => (
                      <section className="space-y-4 border border-foreground bg-card p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <CmsMetaText variant="category">{`${stepIndex + 1}. ${text.steps}`}</CmsMetaText>
                            <CmsTextInput
                              value={step.title ?? ""}
                              disabled={locked}
                              onChange={(event) =>
                                updateDefinition((current) => ({
                                  ...current,
                                  steps: current.steps.map((item, index) =>
                                    index === stepIndex
                                      ? { ...item, title: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <CmsActionButton
                              type="button"
                              size="xs"
                              variant="ghost"
                              disabled={locked}
                              aria-label={text.moveUp}
                              {...dragHandleProps}
                            >
                              <GripVertical aria-hidden />
                            </CmsActionButton>
                            <Button
                              label={text.moveUp}
                              disabled={locked || stepIndex === 0}
                              onClick={() =>
                                updateDefinition((current) => ({
                                  ...current,
                                  steps: move(current.steps, stepIndex, -1),
                                }))
                              }
                            />
                            <Button
                              label={text.moveDown}
                              disabled={locked || stepIndex === definition.steps.length - 1}
                              onClick={() =>
                                updateDefinition((current) => ({
                                  ...current,
                                  steps: move(current.steps, stepIndex, 1),
                                }))
                              }
                            />
                            <Button
                              label={text.remove}
                              disabled={locked}
                              onClick={() =>
                                updateDefinition((current) => ({
                                  ...current,
                                  steps: current.steps.filter((_, index) => index !== stepIndex),
                                }))
                              }
                            />
                          </div>
                        </div>
                        <SortableContext
                          items={step.fields.map((field) => `field:${step.id}:${field.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {step.fields.map((field, fieldIndex) => (
                            <SortableFieldCard
                              key={field.id}
                              id={`field:${step.id}:${field.id}`}
                              disabled={locked}
                            >
                              {(dragHandleProps) => (
                                <FieldEditor
                                  field={field}
                                  disabled={locked}
                                  text={text}
                                  dragHandleProps={dragHandleProps}
                                  onChange={(next) =>
                                    updateField(stepIndex, fieldIndex, () => next)
                                  }
                                  onMove={(direction) =>
                                    updateDefinition((current) => ({
                                      ...current,
                                      steps: current.steps.map((item, index) =>
                                        index === stepIndex
                                          ? {
                                              ...item,
                                              fields: move(item.fields, fieldIndex, direction),
                                            }
                                          : item,
                                      ),
                                    }))
                                  }
                                  onRemove={() =>
                                    updateDefinition((current) => ({
                                      ...current,
                                      steps: current.steps.map((item, index) =>
                                        index === stepIndex
                                          ? {
                                              ...item,
                                              fields: item.fields.filter(
                                                (_, fieldIdx) => fieldIdx !== fieldIndex,
                                              ),
                                            }
                                          : item,
                                      ),
                                    }))
                                  }
                                />
                              )}
                            </SortableFieldCard>
                          ))}
                        </SortableContext>
                        <CmsFormField label={text.fieldType} htmlFor={`${step.id}-field-type`}>
                          <CmsSelect
                            value=""
                            disabled={locked}
                            placeholder={text.addField}
                            options={fieldTypes.map((type) => ({
                              value: type,
                              label: text.fieldTypes[type],
                            }))}
                            onValueChange={(type) => {
                              updateDefinition((current) => ({
                                ...current,
                                steps: current.steps.map((item, index) =>
                                  index === stepIndex
                                    ? {
                                        ...item,
                                        fields: [...item.fields, newField(type as FieldType)],
                                      }
                                    : item,
                                ),
                              }));
                            }}
                          />
                        </CmsFormField>
                      </section>
                    )}
                  </SortableStepCard>
                ))}
              </SortableContext>
            </DndContext>
          </section>
        </div>
        <aside className="space-y-4 lg:border-l lg:border-foreground lg:pl-6">
          <h2 className="font-ui text-sm font-bold uppercase tracking-[.08em]">{text.copy}</h2>
          {(Object.keys(emptyCopy) as (keyof QuestionnaireCopy)[]).map((key) => (
            <CmsFormField key={key} label={text.copyFields[key]} htmlFor={`copy-${key}`}>
              <CmsTextarea
                id={`copy-${key}`}
                value={definition.copy[key] ?? ""}
                onChange={(event) => updateCopy(key, event.target.value)}
              />
            </CmsFormField>
          ))}
          {questionnaireId && questionnaire?.firstResponseAt ? (
            <p className="text-xs text-muted-foreground">
              {text.firstResponseAt}:{" "}
              {new Date(questionnaire.firstResponseAt).toLocaleString("it-IT")}
            </p>
          ) : null}
        </aside>
      </div>
    </form>
  );
}

function Button({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <CmsActionButton
      type="button"
      size="xs"
      variant="ghost"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </CmsActionButton>
  );
}

function SortableStepCard({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (dragHandleProps: HTMLAttributes<HTMLButtonElement>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const cardTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(cardTransform), transition }}
      className={cn(isDragging && "relative z-10 shadow-(--interactive-rail-shadow)")}
    >
      {children(disabled ? {} : { ...attributes, ...listeners })}
    </div>
  );
}

function SortableFieldCard({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (dragHandleProps: HTMLAttributes<HTMLButtonElement>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const cardTransform = transform ? { ...transform, x: 0, scaleX: 1, scaleY: 1 } : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(cardTransform), transition }}
      className={cn(isDragging && "relative z-10 opacity-50 shadow-(--interactive-rail-shadow)")}
    >
      {children(disabled ? {} : { ...attributes, ...listeners })}
    </div>
  );
}

function FieldEditor({
  field,
  disabled,
  text,
  onChange,
  onMove,
  onRemove,
  dragHandleProps,
}: {
  field: QuestionnaireField;
  disabled: boolean;
  text: typeof i18n.cms.forms.resources.questionnaires;
  onChange: (field: QuestionnaireField) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  dragHandleProps: HTMLAttributes<HTMLButtonElement>;
}) {
  const change = (key: string, value: unknown) =>
    onChange({ ...field, [key]: value } as QuestionnaireField);
  const hasOptions = field.type === "singleChoice" || field.type === "multipleChoice";
  return (
    <article className="space-y-4 border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-48 flex-1">
          <CmsFormField label={text.fieldLabel} htmlFor={`${field.id}-label`}>
            <CmsTextInput
              id={`${field.id}-label`}
              value={field.label}
              disabled={disabled}
              onChange={(event) => change("label", event.target.value)}
            />
          </CmsFormField>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <CmsActionButton
            type="button"
            size="xs"
            variant="ghost"
            disabled={disabled}
            aria-label={text.moveUp}
            {...dragHandleProps}
          >
            <GripVertical aria-hidden />
          </CmsActionButton>
          <div className="w-40">
            <CmsSelect
              value={field.type}
              disabled={disabled}
              options={fieldTypes.map((type) => ({ value: type, label: text.fieldTypes[type] }))}
              onValueChange={(type) => onChange(newField(type as FieldType))}
            />
          </div>
          <Button label={text.moveUp} disabled={disabled} onClick={() => onMove(-1)} />
          <Button label={text.moveDown} disabled={disabled} onClick={() => onMove(1)} />
          <Button label={text.remove} disabled={disabled} onClick={onRemove} />
        </div>
      </div>
      <CmsFormField label={text.fieldDescription} htmlFor={`${field.id}-description`}>
        <CmsTextInput
          id={`${field.id}-description`}
          value={field.description ?? ""}
          disabled={disabled}
          onChange={(event) => change("description", event.target.value || undefined)}
        />
      </CmsFormField>
      <div className="flex flex-wrap gap-4">
        <CmsCheckbox
          label={text.required}
          checked={field.required}
          disabled={disabled}
          onChange={(value) => change("required", value)}
        />
        <CmsCheckbox
          label={text.publicResults}
          checked={field.publicResults}
          disabled={disabled}
          onChange={(value) => change("publicResults", value)}
        />
      </div>
      <FieldTypeSettings field={field} disabled={disabled} text={text} onChange={onChange} />
      {hasOptions ? (
        <div className="space-y-2">
          {field.options.map((option, index) => (
            <div className="flex gap-2" key={option.id}>
              <CmsTextInput
                value={option.label}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...field,
                    options: field.options.map((item, idx) =>
                      idx === index ? { ...item, label: event.target.value } : item,
                    ),
                  })
                }
              />
              <Button
                label={text.remove}
                disabled={disabled}
                onClick={() =>
                  onChange({ ...field, options: field.options.filter((_, idx) => idx !== index) })
                }
              />
            </div>
          ))}
          <Button
            label={text.addOption}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...field,
                options: [...field.options, { id: crypto.randomUUID(), label: "Opzione" }],
              })
            }
          />
        </div>
      ) : null}
    </article>
  );
}

function FieldTypeSettings({
  field,
  disabled,
  text,
  onChange,
}: {
  field: QuestionnaireField;
  disabled: boolean;
  text: typeof i18n.cms.forms.resources.questionnaires;
  onChange: (field: QuestionnaireField) => void;
}) {
  const update = (key: string, value: unknown) =>
    onChange({ ...field, [key]: value } as QuestionnaireField);
  const number = (key: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    update(key, value === "" ? undefined : Number(value));
  };
  const textInput = (key: string) => (event: ChangeEvent<HTMLInputElement>) =>
    update(key, event.target.value || undefined);
  const Field = QuestionnaireConfigField;
  const NumberInput = QuestionnaireConfigNumberInput;

  return (
    <fieldset disabled={disabled} className="contents">
      {(() => {
        switch (field.type) {
          case "text":
          case "textarea":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-3">
                <Field label={text.placeholder}>
                  <CmsTextInput
                    id={`${field.id}-placeholder`}
                    value={field.placeholder ?? ""}
                    disabled={disabled}
                    onChange={textInput("placeholder")}
                  />
                </Field>
                <NumberInput
                  label={text.minLength}
                  value={field.minLength}
                  onChange={number("minLength")}
                />
                <NumberInput
                  label={text.maxLength}
                  value={field.maxLength}
                  onChange={number("maxLength")}
                />
              </div>
            );
          case "email":
          case "phone":
          case "url":
            return (
              <div className="border-t border-border pt-4">
                <Field label={text.placeholder}>
                  <CmsTextInput
                    id={`${field.id}-placeholder`}
                    value={field.placeholder ?? ""}
                    disabled={disabled}
                    onChange={textInput("placeholder")}
                  />
                </Field>
              </div>
            );
          case "integer":
          case "decimal":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-3">
                <NumberInput label={text.minimum} value={field.min} onChange={number("min")} />
                <NumberInput label={text.maximum} value={field.max} onChange={number("max")} />
                <NumberInput label={text.stepValue} value={field.step} onChange={number("step")} />
              </div>
            );
          case "date":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <Field label={text.minimum}>
                  <CmsTextInput
                    id={`${field.id}-minimum`}
                    type="date"
                    value={field.min ?? ""}
                    disabled={disabled}
                    onChange={textInput("min")}
                  />
                </Field>
                <Field label={text.maximum}>
                  <CmsTextInput
                    id={`${field.id}-maximum`}
                    type="date"
                    value={field.max ?? ""}
                    disabled={disabled}
                    onChange={textInput("max")}
                  />
                </Field>
              </div>
            );
          case "datetime":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <Field label={text.minimum}>
                  <CmsTextInput
                    id={`${field.id}-minimum`}
                    tone="mono"
                    value={field.min ?? ""}
                    disabled={disabled}
                    onChange={textInput("min")}
                  />
                </Field>
                <Field label={text.maximum}>
                  <CmsTextInput
                    id={`${field.id}-maximum`}
                    tone="mono"
                    value={field.max ?? ""}
                    disabled={disabled}
                    onChange={textInput("max")}
                  />
                </Field>
              </div>
            );
          case "boolean":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <Field label={text.trueLabel}>
                  <CmsTextInput
                    id={`${field.id}-true`}
                    value={field.trueLabel}
                    disabled={disabled}
                    onChange={(event) => update("trueLabel", event.target.value)}
                  />
                </Field>
                <Field label={text.falseLabel}>
                  <CmsTextInput
                    id={`${field.id}-false`}
                    value={field.falseLabel}
                    disabled={disabled}
                    onChange={(event) => update("falseLabel", event.target.value)}
                  />
                </Field>
              </div>
            );
          case "multipleChoice":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                <NumberInput
                  label={text.minSelections}
                  value={field.minSelections}
                  onChange={number("minSelections")}
                />
                <NumberInput
                  label={text.maxSelections}
                  value={field.maxSelections}
                  onChange={number("maxSelections")}
                />
              </div>
            );
          case "scale":
            return (
              <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-3">
                <NumberInput label={text.minimum} value={field.min} onChange={number("min")} />
                <NumberInput label={text.maximum} value={field.max} onChange={number("max")} />
                <NumberInput label={text.stepValue} value={field.step} onChange={number("step")} />
                <Field label={text.minLabel}>
                  <CmsTextInput
                    id={`${field.id}-min-label`}
                    value={field.minLabel ?? ""}
                    disabled={disabled}
                    onChange={textInput("minLabel")}
                  />
                </Field>
                <Field label={text.maxLabel}>
                  <CmsTextInput
                    id={`${field.id}-max-label`}
                    value={field.maxLabel ?? ""}
                    disabled={disabled}
                    onChange={textInput("maxLabel")}
                  />
                </Field>
              </div>
            );
          case "consent":
            return (
              <div className="border-t border-border pt-4">
                <Field label={text.consentText}>
                  <CmsTextarea
                    id={`${field.id}-consent`}
                    value={field.consentText}
                    disabled={disabled}
                    onChange={(event) => update("consentText", event.target.value)}
                  />
                </Field>
              </div>
            );
          case "singleChoice":
          case "information":
            return null;
        }
      })()}
    </fieldset>
  );
}

function QuestionnaireConfigField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <CmsFormField label={label} htmlFor={`questionnaire-config-${label}`}>
      {children}
    </CmsFormField>
  );
}

function QuestionnaireConfigNumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <QuestionnaireConfigField label={label}>
      <CmsTextInput
        id={`questionnaire-config-${label}`}
        type="number"
        tone="mono"
        value={value ?? ""}
        onChange={onChange}
      />
    </QuestionnaireConfigField>
  );
}
