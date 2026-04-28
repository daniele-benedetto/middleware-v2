"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsPageHeader,
  CmsTextInput,
  CmsTextarea,
  cmsToast,
} from "@/components/cms/primitives";
import { useArticlesReorder } from "@/features/cms/articles/hooks/use-article-crud";
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
import {
  invalidateAfterCmsMutation,
  invalidateArticlesAfterMutation,
  invalidateIssuesAfterMutation,
} from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createIssueInputSchema, updateIssueInputSchema } from "@/lib/server/modules/issues/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";

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

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
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
  const reorderMutation = useArticlesReorder();

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
      isMutating={createMutation.isPending || updateMutation.isPending || reorderMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "issues.create");
        success(issueFormText.created);
      }}
      onUpdate={async ({ id, data, orderedArticleIds }) => {
        await updateMutation.mutateAsync({ id, data });

        if (orderedArticleIds && orderedArticleIds.length > 0) {
          try {
            await reorderMutation.mutateAsync({
              issueId: id,
              orderedArticleIds,
            });
          } catch (error) {
            const mapped = mapCrudDomainError(error, "articles");
            cmsToast.error(issueFormText.reorderArticlesFailed(mapped.description), mapped.title);
            await Promise.all([
              invalidateIssuesAfterMutation(trpcUtils, { id }),
              invalidateArticlesAfterMutation(trpcUtils, { ids: orderedArticleIds }),
            ]);
            return;
          }
        }

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
    coverUrl: fieldText.coverUrl,
    color: fieldText.color,
    publishedAt: fieldText.publishedAt,
  };
  const [title, setTitle] = useState(issue?.title ?? "");
  const [slug, setSlug] = useState(issue?.slug ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(issue?.coverUrl ?? "");
  const [color, setColor] = useState(issue?.color ?? "");
  const [isActive, setIsActive] = useState(issue?.isActive ?? true);
  const [publishedAt, setPublishedAt] = useState(toDateTimeLocalValue(issue?.publishedAt ?? null));
  const [orderedArticleIds, setOrderedArticleIds] = useState<string[]>(
    issue?.articles.map((article) => article.id) ?? [],
  );

  const articlesById = new Map((issue?.articles ?? []).map((article) => [article.id, article]));
  const orderedArticles = orderedArticleIds
    .map((id) => articlesById.get(id))
    .filter((article): article is NonNullable<typeof article> => Boolean(article));
  const initialArticleOrder = issue?.articles.map((article) => article.id) ?? [];
  const orderChanged = !orderedIdsEqual(orderedArticleIds, initialArticleOrder);

  const regenerateSlugFromTitle = () => {
    setSlug(normalizeSlug(title));
  };

  const handleSubmit = async () => {
    const normalizedPublishedAt = publishedAt ? new Date(publishedAt) : null;

    if (publishedAt && (!normalizedPublishedAt || Number.isNaN(normalizedPublishedAt.getTime()))) {
      onValidationError(issueFormText.invalidPublishedAt);
      return;
    }

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createIssueInputSchema,
          {
            title,
            slug: slug || undefined,
            description: description || undefined,
            coverUrl: coverUrl || undefined,
            color: color || undefined,
            isActive,
            publishedAt: normalizedPublishedAt || undefined,
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
          slug,
          description: description ? description : null,
          coverUrl: coverUrl ? coverUrl : null,
          color: color ? color : null,
          isActive,
          publishedAt: normalizedPublishedAt,
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
    <div className="space-y-6">
      <CmsPageHeader
        title={mode === "create" ? issueFormText.createTitle : issueFormText.editTitle}
      />

      <div className={mode === "edit" ? "grid gap-6 lg:grid-cols-[1fr_360px]" : "grid gap-6"}>
        <div className="space-y-4 border border-foreground p-4">
          <CmsFormField label={fieldText.title} htmlFor="issue-title" required>
            <CmsTextInput
              id="issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField
            label={fieldText.slug}
            htmlFor="issue-slug"
            required={mode === "edit"}
            hint={mode === "create" ? formText.generatedFromTitleHint : undefined}
          >
            <div className="flex items-center gap-2">
              <CmsTextInput
                id="issue-slug"
                className="flex-1"
                value={slug}
                placeholder={mode === "create" ? "auto da titolo" : undefined}
                onChange={(event) => setSlug(event.target.value)}
              />
              <button
                type="button"
                onClick={regenerateSlugFromTitle}
                className="shrink-0 font-ui text-[10px] uppercase tracking-[0.06em] text-muted-foreground hover:text-accent"
              >
                {formText.regenerateSlug}
              </button>
            </div>
          </CmsFormField>

          <CmsFormField label={fieldText.description} htmlFor="issue-description">
            <CmsTextarea
              id="issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </CmsFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <CmsFormField label={fieldText.coverUrl} htmlFor="issue-cover-url">
              <CmsTextInput
                id="issue-cover-url"
                type="url"
                value={coverUrl}
                onChange={(event) => setCoverUrl(event.target.value)}
              />
            </CmsFormField>

            <CmsFormField label={fieldText.color} htmlFor="issue-color">
              <div className="flex items-center gap-2">
                <CmsTextInput
                  id="issue-color"
                  type="color"
                  className="h-11 w-16 p-1"
                  value={color || "#111111"}
                  onChange={(event) => setColor(event.target.value)}
                />
                <CmsTextInput
                  value={color}
                  placeholder="#111111"
                  onChange={(event) => setColor(event.target.value)}
                />
              </div>
            </CmsFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:items-end">
            <CmsFormField label={fieldText.publishedAt} htmlFor="issue-published-at">
              <CmsTextInput
                id="issue-published-at"
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </CmsFormField>

            <CmsCheckbox
              label={issueFormText.activeLabel}
              checked={isActive}
              onChange={setIsActive}
            />
          </div>

          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton onClick={() => void handleSubmit()} isLoading={isMutating}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        </div>

        {mode === "edit" ? (
          <div className="space-y-3">
            {orderChanged ? (
              <div className="border border-accent px-3 py-2 font-ui text-[11px] uppercase tracking-[0.04em] text-accent">
                {issueFormText.dirtyArticleOrder}
              </div>
            ) : null}
            <IssueArticlesPanel
              articles={orderedArticles}
              onReorder={setOrderedArticleIds}
              disabled={isMutating}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
