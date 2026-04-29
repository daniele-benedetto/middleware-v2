"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { IssueArticlesPanel } from "@/features/cms/issues/components/issue-articles-panel";
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
import { invalidateAfterCmsMutation, invalidateArticlesAfterMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createIssueInputSchema, updateIssueInputSchema } from "@/lib/server/modules/issues/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type IssueFormScreenProps = {
  mode: "create" | "edit";
  issueId?: string;
  initialData?: IssueDetail;
};

type IssueUpdatePayload = {
  id: string;
  data: UpdateIssueInput;
  orderedArticleIds?: string[];
};

function orderedIdsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function moveItemByOffset(ids: string[], index: number, offset: -1 | 1) {
  const nextIndex = index + offset;

  if (index < 0 || nextIndex < 0 || index >= ids.length || nextIndex >= ids.length) {
    return ids;
  }

  const reordered = [...ids];
  const current = reordered[index];

  if (!current) {
    return ids;
  }

  reordered[index] = reordered[nextIndex] ?? "";
  reordered[nextIndex] = current;
  return reordered;
}

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
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-10 flex-1 items-center gap-2 border border-foreground bg-white px-3 text-left",
                "font-ui text-[12px] uppercase tracking-[0.04em] transition-colors hover:bg-card-hover",
                value ? "text-foreground" : "text-border",
              )}
            />
          }
        >
          <CalendarIcon className="size-3.5 shrink-0" />
          {value ? format(value, "dd/MM/yyyy") : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
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
            "inline-flex h-10 shrink-0 items-center border border-foreground bg-white px-3",
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

  useSetCmsBreadcrumbLabel(mode === "edit" ? issueQuery.data?.title : null);

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
      isMutating={createMutation.isPending || updateMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "issues.create");
        success(issueFormText.created);
      }}
      onUpdate={async ({ id, data, orderedArticleIds }) => {
        await updateMutation.mutateAsync({ id, data, orderedArticleIds });

        await Promise.all([
          invalidateAfterCmsMutation(trpcUtils, "issues.update", { id }),
          orderedArticleIds
            ? invalidateArticlesAfterMutation(trpcUtils, { ids: orderedArticleIds })
            : Promise.resolve(),
        ]);
        success(issueFormText.updated);
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
  onMutationError,
  onValidationError,
}: IssueFormContentProps) {
  const text = i18n.cms;
  const formText = text.forms;
  const issueFormText = formText.resources.issues;
  const fieldText = formText.fields;
  const issueFieldLabels = {
    title: fieldText.title,
    slug: fieldText.slug,
    description: fieldText.description,
    publishedAt: fieldText.publishedAt,
  };

  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState<unknown>(issue?.description ?? emptyContentDoc);
  const [isActive, setIsActive] = useState(issue?.isActive ?? true);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    issue?.publishedAt ? new Date(issue.publishedAt) : null,
  );
  const [orderedArticleIds, setOrderedArticleIds] = useState<string[]>(
    issue?.articles.map((article) => article.id) ?? [],
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

  const articlesById = new Map((issue?.articles ?? []).map((article) => [article.id, article]));
  const orderedArticles = orderedArticleIds
    .map((id) => articlesById.get(id))
    .filter((article): article is NonNullable<typeof article> => Boolean(article));
  const initialArticleOrder = issue?.articles.map((article) => article.id) ?? [];
  const orderChanged = !orderedIdsEqual(orderedArticleIds, initialArticleOrder);

  const moveArticleUp = (index: number) => {
    setOrderedArticleIds((current) => moveItemByOffset(current, index, -1));
  };

  const moveArticleDown = (index: number) => {
    setOrderedArticleIds((current) => moveItemByOffset(current, index, 1));
  };

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

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createIssueInputSchema,
          {
            title,
            slug: slugPayload,
            description,
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
          slug: slugPayload,
          description,
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
        orderedArticleIds: orderChanged ? orderedArticleIds : undefined,
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
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isMutating}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-6 overflow-hidden",
          mode === "edit" && "lg:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        <div className="min-h-0 space-y-4 overflow-y-auto pb-6 pr-1">
          <section className="space-y-4 border border-foreground p-4">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {issueFormText.identitySection}
            </div>

            <CmsFormField label={fieldText.title} htmlFor="issue-title" required>
              <CmsTextInput
                id="issue-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </CmsFormField>

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
                      "flex h-10 flex-1 items-center border border-foreground bg-white px-3 text-left",
                      "font-ui text-[12px] uppercase tracking-[0.04em] transition-colors hover:bg-card-hover",
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
                    "inline-flex h-10 shrink-0 items-center border border-foreground bg-white px-3",
                    "font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover",
                  )}
                >
                  {formText.regenerateSlug}
                </button>
              </div>
            </CmsFormField>

            <CmsFormField label={fieldText.description} htmlFor="issue-description">
              <CmsRichTextEditor
                value={description}
                onChange={setDescription}
                ariaLabel={issueFormText.descriptionEditorAriaLabel}
              />
            </CmsFormField>
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {issueFormText.publishingSection}
            </div>

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
          </section>
        </div>

        {mode === "edit" ? (
          <div className="min-h-0 overflow-y-auto pb-6 pl-1">
            <div className="flex min-h-full flex-col gap-3">
              {orderChanged ? (
                <div className="shrink-0 border border-accent px-3 py-2 font-ui text-[11px] uppercase tracking-[0.04em] text-accent">
                  {issueFormText.dirtyArticleOrder}
                </div>
              ) : null}
              <IssueArticlesPanel
                articles={orderedArticles}
                disabled={isMutating}
                className="min-h-0 flex-1 overflow-hidden"
                onMoveUp={moveArticleUp}
                onMoveDown={moveArticleDown}
              />
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
