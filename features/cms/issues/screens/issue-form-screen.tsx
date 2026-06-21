"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CmsConfirmDialog, CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsStyledTitleEditor,
  CmsTextInput,
  createStyledTitleValue,
  getStyledTitlePlainText,
  hasStyledTitleAccent,
  cmsToast,
} from "@/components/cms/primitives";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IssueHomeBlocksEditor } from "@/features/cms/issues/components/issue-home-blocks-editor";
import {
  useIssueById,
  useIssueCreate,
  useIssueUpdate,
  type CreateIssueInput,
  type IssueDetail,
  type UpdateIssueInput,
} from "@/features/cms/issues/hooks/use-issue-crud";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createIssueInputSchema, updateIssueInputSchema } from "@/lib/server/modules/issues/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { IssueHomeBlocks } from "@/lib/server/modules/issues/schema";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type IssueFormScreenProps = {
  mode: "create" | "edit";
  issueId?: string;
  initialData?: IssueDetail;
};

type IssueUpdatePayload = {
  id: string;
  data: UpdateIssueInput;
};

function normalizePickedDate(value: Date) {
  const next = new Date(value);
  next.setHours(12, 0, 0, 0);
  return next;
}

function IssuePublishedDatePicker({
  value,
  placeholder,
  clearLabel,
  onChange,
}: {
  value: Date | null;
  placeholder: string;
  clearLabel: string;
  onChange: (value: Date | null) => void;
}) {
  const formattedValue = value ? format(value, "dd/MM/yyyy") : placeholder;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-10 flex-1 items-center justify-between gap-3 rounded-[6px] border border-foreground bg-white px-3 text-left",
                "font-ui text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-surface-hover",
                value ? "text-foreground" : "text-border",
              )}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="truncate">{formattedValue}</span>
          </span>
          <span className="shrink-0 text-[10px] tracking-[0.08em] text-muted-foreground">Data</span>
        </PopoverTrigger>
        <PopoverContent className="w-[20rem] rounded-[8px] border border-foreground bg-white p-0 shadow-none">
          <Calendar
            key={value ? format(value, "yyyy-MM-dd") : "empty-date"}
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => {
              if (date) {
                onChange(normalizePickedDate(date));
              }
            }}
          />
        </PopoverContent>
      </Popover>

      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "inline-flex h-10 shrink-0 items-center rounded-[6px] border border-foreground bg-white px-3",
            "font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover",
          )}
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}

export function CmsIssueFormScreen({ mode, issueId, initialData }: IssueFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/issues");
  const text = i18n.cms;
  const formText = text.forms;
  const issueFormText = formText.resources.issues;
  const issueQuery = useIssueById(mode === "edit" ? issueId : undefined, { initialData });
  const createMutation = useIssueCreate();
  const updateMutation = useIssueUpdate();
  const deleteMutation = trpc.issues.delete.useMutation();

  if (mode === "edit" && !issueId) {
    return (
      <CmsErrorState
        title={issueFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && issueQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && issueQuery.isError) {
    const mapped = mapCrudDomainError(issueQuery.error, "issues");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  return (
    <IssueFormContent
      mode={mode}
      issueId={issueId}
      issue={issueQuery.data}
      isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "issues.create");
        success(issueFormText.created);
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, "issues.update", { id });
        success(issueFormText.updated);
      }}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
        await invalidateAfterCmsMutation(trpcUtils, "issues.delete", { id });
        success();
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "issues");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

type IssueFormContentProps = {
  mode: "create" | "edit";
  issueId?: string;
  issue?: IssueDetail;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateIssueInput) => Promise<void>;
  onUpdate: (payload: IssueUpdatePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

function IssueFormContent({
  mode,
  issueId,
  issue,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onDelete,
  onMutationError,
  onValidationError,
}: IssueFormContentProps) {
  const text = i18n.cms;
  const formText = text.forms;
  const issueFormText = formText.resources.issues;
  const fieldText = formText.fields;
  const issueFieldLabels = {
    title: fieldText.title,
    titleStyled: fieldText.titleStyled,
    slug: fieldText.slug,
    description: fieldText.description,
    homeBlocks: issueFormText.homeBlocksLabel,
    publishedAt: fieldText.publishedAt,
  };

  const [titleStyled, setTitleStyled] = useState(() =>
    createStyledTitleValue(issue?.title ?? "", issue?.titleStyled),
  );
  const title = getStyledTitlePlainText(titleStyled);
  const [description, setDescription] = useState<unknown>(issue?.description ?? emptyContentDoc);
  const [homeBlocks, setHomeBlocks] = useState<IssueHomeBlocks>(() => issue?.homeBlocks ?? []);
  const [isActive, setIsActive] = useState(issue?.isActive ?? true);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    issue?.publishedAt ? new Date(issue.publishedAt) : null,
  );

  const initialAutoSlug = useMemo(() => normalizeSlug(issue?.title ?? ""), [issue?.title]);
  const [manualSlug, setManualSlug] = useState(issue?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(issue?.slug) && issue?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const autoSlug = normalizeSlug(title);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || issueFormText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? issueFormText.slugManualHint
    : formText.generatedFromTitleHint;

  const articles = issue?.articles ?? [];
  const isBusy = isMutating;

  const openSlugEditor = () => {
    setManualSlug(resolvedSlug);
    setIsSlugEditing(true);
  };

  const regenerateSlugFromTitle = () => {
    setManualSlug(autoSlug);
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };

  const handleSubmit = async () => {
    if (publishedAt && Number.isNaN(publishedAt.getTime())) {
      onValidationError(issueFormText.invalidPublishedAt);
      return;
    }

    const slugPayload = hasManualSlugOverride ? manualSlug : resolvedSlug || undefined;
    const homeBlocksPayload = homeBlocks.length > 0 ? homeBlocks : null;

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createIssueInputSchema,
          {
            title,
            titleStyled: hasStyledTitleAccent(titleStyled) ? titleStyled : null,
            slug: slugPayload,
            description,
            homeBlocks: homeBlocksPayload,
            isActive,
            publishedAt: publishedAt ?? undefined,
          },
          issueFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateIssueInputSchema,
        {
          title,
          titleStyled: hasStyledTitleAccent(titleStyled) ? titleStyled : null,
          slug: slugPayload,
          description,
          homeBlocks: homeBlocksPayload,
          isActive,
          publishedAt,
        },
        issueFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: issueId!,
        data: validation.value,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <CmsPageHeader
        title={mode === "create" ? issueFormText.createTitle : issueFormText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            {mode === "edit" && issueId ? (
              <CmsConfirmDialog
                triggerLabel={text.quickActions.delete}
                triggerIcon={<Trash2 aria-hidden />}
                triggerDisabled={isBusy}
                title={text.quickActions.confirmDeleteTitle}
                description={text.quickActions.confirmDeleteSingleIssue}
                tone="danger"
                onConfirm={() => onDelete(issueId)}
              />
            ) : null}
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isBusy}>
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isBusy}>
              {mode === "create" ? <Plus aria-hidden /> : <Save aria-hidden />}
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField
            label={fieldText.title}
            htmlFor="issue-title"
            hint={issueFormText.titleStyledHint}
            required
          >
            <CmsStyledTitleEditor
              id="issue-title"
              value={titleStyled}
              onChange={setTitleStyled}
              placeholder={fieldText.title}
              accentLabel={issueFormText.titleStyledAccentAction}
              ariaLabel={issueFormText.titleStyledEditorAriaLabel}
            />
          </CmsFormField>

          <input type="hidden" name="title" value={title} />

          <CmsFormField label={fieldText.slug} htmlFor="issue-slug" hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <CmsTextInput
                  id="issue-slug"
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
                    "flex h-10 flex-1 items-center rounded-[6px] border border-foreground bg-white px-3 text-left",
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
                  "inline-flex h-10 shrink-0 items-center rounded-[6px] border border-foreground bg-white px-3",
                  "font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-surface-hover",
                )}
              >
                {formText.regenerateSlug}
              </button>
            </div>
          </CmsFormField>

          <CmsFormField
            label={fieldText.description}
            htmlFor="issue-description"
            className="flex flex-1 flex-col"
          >
            <CmsRichTextEditor
              value={description}
              onChange={setDescription}
              ariaLabel={issueFormText.descriptionEditorAriaLabel}
              fullHeight
            />
          </CmsFormField>

          <CmsFormField label={issueFormText.homeBlocksLabel} htmlFor="issue-home-blocks">
            <IssueHomeBlocksEditor
              value={homeBlocks}
              articles={articles}
              disabled={isBusy}
              text={issueFormText.homeBlocksEditor}
              onChange={setHomeBlocks}
            />
          </CmsFormField>
        </div>

        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {issueFormText.publishingSection}
            </div>

            <div className="space-y-4">
              <CmsCheckbox
                label={issueFormText.activeLabel}
                checked={isActive}
                onChange={setIsActive}
              />

              <CmsFormField label={fieldText.publishedAt} htmlFor="issue-published-at">
                <IssuePublishedDatePicker
                  value={publishedAt}
                  placeholder={issueFormText.selectDatePlaceholder}
                  clearLabel={formText.clearDate}
                  onChange={setPublishedAt}
                />
              </CmsFormField>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
