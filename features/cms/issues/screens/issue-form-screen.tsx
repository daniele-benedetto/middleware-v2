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
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
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
                "flex h-10 flex-1 items-center justify-between gap-3 border border-foreground bg-white px-3 text-left",
                "font-ui text-[12px] uppercase tracking-[0.04em] transition-colors hover:bg-card-hover",
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
        <PopoverContent className="w-[20rem] rounded-none border border-foreground bg-white p-0 shadow-none">
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
  const articleReorderMutation = trpc.articles.reorder.useMutation();

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
      isArticleOrderPending={articleReorderMutation.isPending}
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
      onReorderArticles={async ({ issueId: currentIssueId, orderedArticleIds }) => {
        const reorderedItems = await articleReorderMutation.mutateAsync({
          issueId: currentIssueId,
          orderedArticleIds,
        });

        await Promise.all([
          invalidateAfterCmsMutation(trpcUtils, "articles.reorder", { ids: orderedArticleIds }),
          invalidateAfterCmsMutation(trpcUtils, "issues.update", { id: currentIssueId }),
        ]);

        cmsToast.info(text.lists.articles.reorderUpdated);
        return reorderedItems.map((item) => item.id);
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
  isArticleOrderPending: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateIssueInput) => Promise<void>;
  onUpdate: (payload: IssueUpdatePayload) => Promise<void>;
  onReorderArticles: (payload: {
    issueId: string;
    orderedArticleIds: string[];
  }) => Promise<string[]>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

function IssueFormContent({
  mode,
  issueId,
  issue,
  isMutating,
  isArticleOrderPending,
  onCancel,
  onCreate,
  onUpdate,
  onReorderArticles,
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
  const isBusy = isMutating || isArticleOrderPending;

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
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  const handleArticleReorder = async (nextOrder: string[]) => {
    if (!issueId) {
      return;
    }

    const previousOrder = orderedArticleIds;

    setOrderedArticleIds(nextOrder);

    try {
      const syncedOrder = await onReorderArticles({ issueId, orderedArticleIds: nextOrder });
      setOrderedArticleIds(syncedOrder);
    } catch (error) {
      setOrderedArticleIds(previousOrder);
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
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
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isBusy}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isBusy}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
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

          <CmsFormField
            label={fieldText.description}
            htmlFor="issue-description"
            className="flex min-h-0 flex-1 flex-col"
          >
            <CmsRichTextEditor
              value={description}
              onChange={setDescription}
              ariaLabel={issueFormText.descriptionEditorAriaLabel}
              fullHeight
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

          {mode === "edit" ? (
            <section className="flex min-h-0 flex-1 flex-col">
              <IssueArticlesPanel
                articles={orderedArticles}
                disabled={isBusy}
                className="min-h-0 flex-1"
                onReorder={handleArticleReorder}
              />
            </section>
          ) : null}
        </div>
      </div>
    </form>
  );
}
