"use client";

import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClipboardList, GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type HTMLAttributes, type ReactNode } from "react";

import { CmsErrorState } from "@/components/cms/common";
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
import { CmsQuestionnaireFormLoading } from "@/features/cms/questionnaires/components/questionnaire-form-loading";
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
import { invalidateAfterCmsMutation, invalidateQuestionnairesAfterMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  createQuestionnaireInputSchema,
  type QuestionnaireHomeVariant,
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
const publicAnalysisFieldTypes = new Set<FieldType>([
  "boolean",
  "date",
  "datetime",
  "decimal",
  "integer",
  "multipleChoice",
  "scale",
  "singleChoice",
]);
const questionnaireHomeVariantOptions = [
  { value: "black", labelKey: "homeVariantBlack" },
  { value: "red", labelKey: "homeVariantRed" },
  { value: "default", labelKey: "homeVariantDefault" },
] as const;
type FieldType = (typeof fieldTypes)[number];
type QuestionnaireEditorSection = "overview" | "copy" | string;

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
  completionCtaLabel: "Torna alla rivista",
  completionCtaHref: "/",
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

function toDateTimeLocalValue(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toIsoDateTimeValue(value: string) {
  return value ? new Date(value).toISOString() : undefined;
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
  const publish = trpc.questionnaires.publish.useMutation();
  const close = trpc.questionnaires.close.useMutation();
  const archive = trpc.questionnaires.archive.useMutation();
  const restore = trpc.questionnaires.restore.useMutation();
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
  if (mode === "edit" && query.isPending) return <CmsQuestionnaireFormLoading />;
  if (mode === "edit" && query.isError) {
    const error = mapCrudDomainError(query.error, "questionnaires");
    return <CmsErrorState title={error.title} description={error.description} />;
  }

  return (
    <QuestionnaireFormContent
      mode={mode}
      questionnaireId={questionnaireId}
      questionnaire={query.data}
      busy={
        create.isPending ||
        update.isPending ||
        publish.isPending ||
        close.isPending ||
        archive.isPending ||
        restore.isPending
      }
      onCancel={cancel}
      onStatusChange={async (status) => {
        if (!questionnaireId) return;
        try {
          const currentStatus = query.data?.status;
          if (!currentStatus || status === currentStatus) return;

          if (status === "DRAFT") await restore.mutateAsync({ id: questionnaireId });
          if (status === "PUBLISHED") await publish.mutateAsync({ id: questionnaireId });
          if (status === "CLOSED") await close.mutateAsync({ id: questionnaireId });
          if (status === "ARCHIVED") await archive.mutateAsync({ id: questionnaireId });
          await invalidateQuestionnairesAfterMutation(utils, { id: questionnaireId });
          const messages = {
            DRAFT: text.updated,
            PUBLISHED: text.published,
            CLOSED: text.closed,
            ARCHIVED: text.archived,
          };
          cmsToast.success(messages[status]);
        } catch (error) {
          const mapped = mapCrudDomainError(error, "questionnaires");
          cmsToast.error(mapped.description, mapped.title);
        }
      }}
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
  onStatusChange,
  onSave,
}: {
  mode: "create" | "edit";
  questionnaireId?: string;
  questionnaire?: QuestionnaireDetail;
  busy: boolean;
  onCancel: () => void;
  onStatusChange: (status: QuestionnaireDetail["status"]) => Promise<void>;
  onSave: (data: {
    title: string;
    titleStyled: IssueTitleStyled | null;
    slug: string;
    descriptionRich: unknown | null;
    definition: QuestionnaireDefinition;
    homeVariant: QuestionnaireHomeVariant;
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
  const [homeVariant, setHomeVariant] = useState<QuestionnaireHomeVariant>(
    questionnaire?.homeVariant ?? "black",
  );
  const [definition, setDefinition] = useState<QuestionnaireDefinition>(
    questionnaire?.definition ?? emptyDefinition,
  );
  const [activeSection, setActiveSection] = useState<QuestionnaireEditorSection>("overview");
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
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
  const homeVariantOptions = questionnaireHomeVariantOptions.map((option) => ({
    value: option.value,
    label: text[option.labelKey],
  }));
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
  const activeStepIndex = definition.steps.findIndex((step) => step.id === activeSection);
  const activeStep = activeStepIndex >= 0 ? definition.steps[activeStepIndex] : null;
  const addStep = () => {
    const step = {
      id: crypto.randomUUID(),
      title: `Step ${definition.steps.length + 1}`,
      fields: [],
    };
    updateDefinition((current) => ({ ...current, steps: [...current.steps, step] }));
    setActiveSection(step.id);
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
          homeVariant,
        });
      }}
    >
      <CmsPageHeader
        title={mode === "create" ? text.createTitle : text.editTitle}
        actions={
          <div className="flex flex-wrap gap-2">
            {mode === "edit" && questionnaireId && questionnaire?.responseCount ? (
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
      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:pr-1">
        <aside className="flex min-h-0 flex-col gap-3 lg:border-r lg:border-foreground lg:pr-5">
          <nav aria-label="Sezioni del questionario" className="space-y-1">
            <EditorNavButton
              active={activeSection === "overview"}
              label="Panoramica"
              onClick={() => setActiveSection("overview")}
            />
            <EditorNavButton
              active={activeSection === "copy"}
              label="Testi e privacy"
              onClick={() => setActiveSection("copy")}
            />
          </nav>
          <div className="flex min-h-0 flex-1 flex-col border-t border-foreground pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <CmsMetaText variant="category">{text.steps}</CmsMetaText>
            </div>
            <div className="cms-scroll min-h-0 flex-1 overflow-y-auto">
              <DndContext
                id="cms-questionnaire-steps-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStepDragEnd}
              >
                <SortableContext
                  items={definition.steps.map((step) => step.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {definition.steps.map((step, stepIndex) => {
                      return (
                        <SortableStepCard key={step.id} id={step.id} disabled={locked}>
                          {(dragHandleProps) => (
                            <div
                              className={cn(
                                "relative flex min-w-0 items-center gap-2 rounded-[6px] border-l-4 py-3 pr-3 pl-4",
                                "font-ui text-[12px] font-extrabold uppercase tracking-[0.1em] transition-colors",
                                activeSection === step.id
                                  ? "border-accent bg-card-hover text-accent"
                                  : "border-transparent text-foreground hover:border-foreground hover:bg-card-hover",
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveSection(step.id)}
                                className="min-w-0 flex-1 cursor-pointer truncate text-left focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px]"
                              >
                                {step.title || "Step senza titolo"}
                              </button>
                              <button
                                type="button"
                                disabled={locked}
                                aria-label={`Riordina ${step.title || `step ${stepIndex + 1}`}`}
                                title="Trascina per riordinare"
                                className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-[4px] text-current/60 transition-colors hover:bg-surface-hover hover:text-current active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-border [&>svg]:size-4"
                                {...dragHandleProps}
                              >
                                <GripVertical aria-hidden />
                              </button>
                              <button
                                type="button"
                                disabled={locked || definition.steps.length === 1}
                                onClick={() => {
                                  updateDefinition((current) => ({
                                    ...current,
                                    steps: current.steps.filter((_, index) => index !== stepIndex),
                                  }));
                                  if (activeSection === step.id) setActiveSection("overview");
                                }}
                                aria-label={`Elimina ${step.title || `step ${stepIndex + 1}`}`}
                                title="Elimina step"
                                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-current/60 transition-colors hover:bg-surface-hover hover:text-accent focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-border [&>svg]:size-4"
                              >
                                <Trash2 aria-hidden />
                              </button>
                            </div>
                          )}
                        </SortableStepCard>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
            <CmsActionButton
              type="button"
              size="xs"
              variant="outline"
              className="mt-3 w-full"
              disabled={locked}
              onClick={addStep}
            >
              <Plus aria-hidden />
              {text.addStep}
            </CmsActionButton>
          </div>
        </aside>
        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6">
          {activeSection === "overview" ? (
            <section className="space-y-6" aria-labelledby="questionnaire-overview-title">
              <div className="border-b border-foreground pb-4">
                <CmsMetaText variant="category">Panoramica</CmsMetaText>
                <h2
                  id="questionnaire-overview-title"
                  className="mt-1 font-ui text-2xl font-black uppercase tracking-tight"
                >
                  Impostazioni del questionario
                </h2>
              </div>
              {mode === "edit" && questionnaire ? (
                <QuestionnaireStatusPanel
                  status={questionnaire.status}
                  busy={busy}
                  text={text}
                  onChange={onStatusChange}
                />
              ) : null}
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
              <CmsFormField label={text.homeVariantLabel} htmlFor="questionnaire-home-variant">
                <CmsSelect
                  value={homeVariant}
                  disabled={busy}
                  options={homeVariantOptions}
                  onValueChange={(nextVariant) =>
                    setHomeVariant(nextVariant as QuestionnaireHomeVariant)
                  }
                />
              </CmsFormField>
            </section>
          ) : null}
          {activeSection === "copy" ? (
            <section className="space-y-4" aria-labelledby="questionnaire-copy-title">
              <div className="border-b border-foreground pb-4">
                <CmsMetaText variant="category">{text.copy}</CmsMetaText>
                <h2
                  id="questionnaire-copy-title"
                  className="mt-1 font-ui text-2xl font-black uppercase tracking-tight"
                >
                  Testi e privacy
                </h2>
              </div>
              {(Object.keys(emptyCopy) as (keyof QuestionnaireCopy)[]).map((key) => (
                <CmsFormField key={key} label={text.copyFields[key]} htmlFor={`copy-${key}`}>
                  <CmsTextarea
                    id={`copy-${key}`}
                    value={definition.copy[key] ?? ""}
                    onChange={(event) => updateCopy(key, event.target.value)}
                  />
                </CmsFormField>
              ))}
            </section>
          ) : null}
          {activeStep ? (
            <StepCanvas
              step={activeStep}
              stepIndex={activeStepIndex}
              totalSteps={definition.steps.length}
              locked={locked}
              sensors={sensors}
              expandedFieldId={expandedFieldId}
              setExpandedFieldId={setExpandedFieldId}
              text={text}
              onStepChange={(transform) =>
                updateDefinition((current) => ({
                  ...current,
                  steps: current.steps.map((item, index) =>
                    index === activeStepIndex ? transform(item) : item,
                  ),
                }))
              }
              onFieldChange={(fieldIndex, next) =>
                updateField(activeStepIndex, fieldIndex, () => next)
              }
              onRemoveField={(fieldIndex) =>
                updateDefinition((current) => ({
                  ...current,
                  steps: current.steps.map((item, index) =>
                    index === activeStepIndex
                      ? { ...item, fields: item.fields.filter((_, index) => index !== fieldIndex) }
                      : item,
                  ),
                }))
              }
              onAddField={(type) => {
                const field = newField(type);
                updateDefinition((current) => ({
                  ...current,
                  steps: current.steps.map((item, index) =>
                    index === activeStepIndex ? { ...item, fields: [...item.fields, field] } : item,
                  ),
                }));
                setExpandedFieldId(field.id);
              }}
            />
          ) : null}
        </div>
      </div>
    </form>
  );
}

function QuestionnaireStatusPanel({
  status,
  busy,
  text,
  onChange,
}: {
  status: QuestionnaireDetail["status"];
  busy: boolean;
  text: typeof i18n.cms.forms.resources.questionnaires;
  onChange: (status: QuestionnaireDetail["status"]) => Promise<void>;
}) {
  const statusOptions = {
    DRAFT: [
      { value: "DRAFT", label: text.statusDraft },
      { value: "PUBLISHED", label: text.statusPublished },
      { value: "ARCHIVED", label: text.statusArchived },
    ],
    PUBLISHED: [
      { value: "PUBLISHED", label: text.statusPublished },
      { value: "CLOSED", label: text.statusClosed },
      { value: "ARCHIVED", label: text.statusArchived },
    ],
    CLOSED: [
      { value: "CLOSED", label: text.statusClosed },
      { value: "ARCHIVED", label: text.statusArchived },
    ],
    ARCHIVED: [
      { value: "ARCHIVED", label: text.statusArchived },
      { value: "DRAFT", label: text.statusDraft },
    ],
  };

  return (
    <CmsFormField label={text.status} htmlFor="questionnaire-status">
      <CmsSelect
        value={status}
        disabled={busy}
        onValueChange={(value) => void onChange(value as QuestionnaireDetail["status"])}
        options={statusOptions[status]}
      />
    </CmsFormField>
  );
}

function EditorNavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative block w-full cursor-pointer rounded-[6px] border-l-4 py-3 pr-3 pl-4 text-left",
        "font-ui text-[12px] font-extrabold uppercase tracking-[0.1em] transition-colors",
        "focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px]",
        active
          ? "border-accent bg-card-hover text-accent"
          : "border-transparent text-foreground hover:border-foreground hover:bg-card-hover",
      )}
    >
      {label}
    </button>
  );
}

function StepCanvas({
  step,
  stepIndex,
  totalSteps,
  locked,
  sensors,
  expandedFieldId,
  setExpandedFieldId,
  text,
  onStepChange,
  onFieldChange,
  onRemoveField,
  onAddField,
}: {
  step: QuestionnaireDefinition["steps"][number];
  stepIndex: number;
  totalSteps: number;
  locked: boolean;
  sensors: ReturnType<typeof useSortableSensors>;
  expandedFieldId: string | null;
  setExpandedFieldId: (id: string | null) => void;
  text: typeof i18n.cms.forms.resources.questionnaires;
  onStepChange: (
    transform: (
      step: QuestionnaireDefinition["steps"][number],
    ) => QuestionnaireDefinition["steps"][number],
  ) => void;
  onFieldChange: (fieldIndex: number, field: QuestionnaireField) => void;
  onRemoveField: (fieldIndex: number) => void;
  onAddField: (type: FieldType) => void;
}) {
  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = step.fields.findIndex((field) => `field:${step.id}:${field.id}` === active.id);
    const newIndex = step.fields.findIndex((field) => `field:${step.id}:${field.id}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onStepChange((current) => ({
      ...current,
      fields: arrayMove(current.fields, oldIndex, newIndex),
    }));
  };

  return (
    <section className="space-y-5" aria-labelledby="questionnaire-step-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground pb-4">
        <div>
          <CmsMetaText variant="category">{`Step ${stepIndex + 1} di ${totalSteps}`}</CmsMetaText>
          <h2
            id="questionnaire-step-title"
            className="mt-1 font-ui text-2xl font-black uppercase tracking-tight"
          >
            {step.title || "Step senza titolo"}
          </h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CmsFormField label="Titolo dello step" htmlFor={`${step.id}-title`}>
          <CmsTextInput
            id={`${step.id}-title`}
            value={step.title ?? ""}
            disabled={locked}
            onChange={(event) =>
              onStepChange((current) => ({ ...current, title: event.target.value }))
            }
          />
        </CmsFormField>
        <CmsFormField label="Descrizione dello step" htmlFor={`${step.id}-description`}>
          <CmsTextInput
            id={`${step.id}-description`}
            value={step.description ?? ""}
            disabled={locked}
            onChange={(event) =>
              onStepChange((current) => ({
                ...current,
                description: event.target.value || undefined,
              }))
            }
          />
        </CmsFormField>
      </div>
      <div className="border-t border-foreground pt-4">
        <CmsMetaText variant="category">Domande</CmsMetaText>
      </div>
      <DndContext
        id={`cms-questionnaire-step-${step.id}-fields-dnd`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleFieldDragEnd}
      >
        <SortableContext
          items={step.fields.map((field) => `field:${step.id}:${field.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
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
                    expanded={expandedFieldId === field.id}
                    text={text}
                    dragHandleProps={dragHandleProps}
                    onToggle={() =>
                      setExpandedFieldId(expandedFieldId === field.id ? null : field.id)
                    }
                    onChange={(next) => {
                      onFieldChange(fieldIndex, next);
                      if (next.id !== field.id) setExpandedFieldId(next.id);
                    }}
                    onRemove={() => {
                      onRemoveField(fieldIndex);
                      if (expandedFieldId === field.id) setExpandedFieldId(null);
                    }}
                  />
                )}
              </SortableFieldCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <CmsFormField label={text.fieldType} htmlFor={`${step.id}-field-type`}>
        <CmsSelect
          value=""
          disabled={locked}
          placeholder={text.addField}
          options={fieldTypes.map((type) => ({ value: type, label: text.fieldTypes[type] }))}
          onValueChange={(type) => onAddField(type as FieldType)}
        />
      </CmsFormField>
    </section>
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
  expanded,
  text,
  onChange,
  onRemove,
  onToggle,
  dragHandleProps,
}: {
  field: QuestionnaireField;
  disabled: boolean;
  expanded: boolean;
  text: typeof i18n.cms.forms.resources.questionnaires;
  onChange: (field: QuestionnaireField) => void;
  onRemove: () => void;
  onToggle: () => void;
  dragHandleProps: HTMLAttributes<HTMLButtonElement>;
}) {
  const change = (key: string, value: unknown) =>
    onChange({ ...field, [key]: value } as QuestionnaireField);
  const hasOptions = field.type === "singleChoice" || field.type === "multipleChoice";
  return (
    <article>
      <div
        className={cn(
          "relative flex min-w-0 items-center gap-2 rounded-[6px] border-l-4 py-3 pr-3 pl-4",
          "font-ui text-[12px] font-extrabold uppercase tracking-[0.1em] transition-colors",
          expanded
            ? "border-accent bg-card-hover text-accent"
            : "border-transparent text-foreground hover:border-foreground hover:bg-card-hover",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 cursor-pointer truncate text-left focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-[-3px]"
        >
          {field.label || "Domanda senza titolo"}
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label="Riordina domanda"
          title="Trascina per riordinare"
          className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-[4px] text-current/60 transition-colors hover:bg-surface-hover hover:text-current active:cursor-grabbing focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-border [&>svg]:size-4"
          {...dragHandleProps}
        >
          <GripVertical aria-hidden />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Elimina ${field.label || "domanda"}`}
          title="Elimina domanda"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-current/60 transition-colors hover:bg-surface-hover hover:text-accent focus-visible:outline-3 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-border [&>svg]:size-4"
        >
          <Trash2 aria-hidden />
        </button>
      </div>
      {expanded ? (
        <div className="mt-2 space-y-4 border border-foreground bg-card p-4">
          <div className="grid gap-4 border-b border-border pb-3 md:grid-cols-[minmax(0,1fr)_12rem]">
            <div>
              <CmsFormField label={text.fieldLabel} htmlFor={`${field.id}-label`}>
                <CmsTextInput
                  id={`${field.id}-label`}
                  value={field.label}
                  disabled={disabled}
                  onChange={(event) => change("label", event.target.value)}
                />
              </CmsFormField>
            </div>
            <div>
              <CmsFormField label={text.fieldType} htmlFor={`${field.id}-type`}>
                <CmsSelect
                  value={field.type}
                  disabled={disabled}
                  options={fieldTypes.map((type) => ({
                    value: type,
                    label: text.fieldTypes[type],
                  }))}
                  onValueChange={(type) => onChange(newField(type as FieldType))}
                />
              </CmsFormField>
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
            {publicAnalysisFieldTypes.has(field.type) ? (
              <CmsCheckbox
                label={text.publicResults}
                checked={field.publicResults}
                disabled={disabled}
                onChange={(value) => change("publicResults", value)}
              />
            ) : null}
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
                      onChange({
                        ...field,
                        options: field.options.filter((_, idx) => idx !== index),
                      })
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
  const dateTimeInput = (key: string) => (event: ChangeEvent<HTMLInputElement>) =>
    update(key, toIsoDateTimeValue(event.target.value));
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
                    type="datetime-local"
                    value={toDateTimeLocalValue(field.min)}
                    disabled={disabled}
                    onChange={dateTimeInput("min")}
                  />
                </Field>
                <Field label={text.maximum}>
                  <CmsTextInput
                    id={`${field.id}-maximum`}
                    type="datetime-local"
                    value={toDateTimeLocalValue(field.max)}
                    disabled={disabled}
                    onChange={dateTimeInput("max")}
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
