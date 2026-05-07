"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CmsErrorState } from "@/components/cms/common";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
import {
  CmsActionButton,
  CmsBody,
  CmsCheckbox,
  CmsFormField,
  CmsMetaText,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsSearchSelect,
  CmsSelect,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import { CmsArticleFormLoading } from "@/features/cms/articles/components/article-form-loading";
import { ArticleMediaFieldPreview } from "@/features/cms/articles/components/article-media-field-preview";
import { ArticleTagsMultiSelect } from "@/features/cms/articles/components/article-tags-multi-select";
import {
  useArticleById,
  useArticleCreate,
  useArticleSyncTags,
  useArticleUpdate,
  useCategoryOptions,
  useIssueOptions,
  useTagOptions,
  useUserOptions,
  type ArticleDetail,
  type CreateArticleInput,
  type UpdateArticleInput,
} from "@/features/cms/articles/hooks/use-article-crud";
import { CmsMediaPickerDialog } from "@/features/cms/media/components/media-picker-dialog";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  createArticleInputSchema,
  updateArticleInputSchema,
} from "@/lib/server/modules/articles/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type {
  CategoriesListInitialData,
  IssuesListInitialData,
  TagsListInitialData,
  UsersAuthorOptionsInitialData,
} from "@/features/cms/shared/types/initial-data";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type ArticleFormScreenProps = {
  mode: "create" | "edit";
  articleId?: string;
  initialData?: ArticleDetail;
  initialOptionsData?: ArticleFormOptionsInitialData;
};

type ArticleFormOptionsInitialData = {
  tagsOptions: TagsListInitialData;
  issuesOptions: IssuesListInitialData;
  categoriesOptions: CategoriesListInitialData;
  authorsOptions: UsersAuthorOptionsInitialData;
};

type ArticleEditorialStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const articleStatusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const articleFormStateSchema = z.object({
  issueId: z.string().uuid(),
  categoryId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().trim().min(1),
  slug: z.string().trim(),
  excerptRich: z.unknown(),
  contentRich: z.unknown(),
  imageUrl: z.string().trim().refine(isValidOptionalUrl),
  audioUrl: z.string().trim().refine(isValidOptionalUrl),
  audioChunksUrl: z.string().trim().refine(isValidOptionalUrl),
  tagIds: z.array(z.string().uuid()),
  status: z.enum(articleStatusOptions),
  isFeatured: z.boolean(),
});

type ArticleFormValues = z.infer<typeof articleFormStateSchema>;

function tagIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function extractAudioChunksUrl(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isValidOptionalUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function resolvePublishedAtForStatus(status: ArticleEditorialStatus, currentValue: string | null) {
  if (status !== "PUBLISHED") {
    return null;
  }

  if (!currentValue) {
    return new Date();
  }

  const parsed = new Date(currentValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getArticleFormDefaultValues(article?: ArticleDetail): ArticleFormValues {
  return {
    issueId: article?.issueId ?? "",
    categoryId: article?.categoryId ?? "",
    authorId: article?.authorId ?? "",
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerptRich: article?.excerptRich ?? emptyContentDoc,
    contentRich: article?.contentRich ?? emptyContentDoc,
    imageUrl: article?.imageUrl ?? "",
    audioUrl: article?.audioUrl ?? "",
    audioChunksUrl: extractAudioChunksUrl(article?.audioChunks),
    tagIds: article?.tagIds ?? [],
    status: article?.status ?? "DRAFT",
    isFeatured: article?.isFeatured ?? false,
  };
}

function buildCreateArticlePayload(values: ArticleFormValues, resolvedSlug: string) {
  return {
    issueId: values.issueId,
    categoryId: values.categoryId,
    authorId: values.authorId,
    title: values.title,
    slug: resolvedSlug,
    excerptRich: values.excerptRich,
    contentRich: values.contentRich,
    imageUrl: values.imageUrl || undefined,
    audioUrl: values.audioUrl || undefined,
    audioChunks: values.audioChunksUrl || undefined,
    tagIds: values.tagIds.length > 0 ? values.tagIds : undefined,
  };
}

function buildUpdateArticlePayload(
  values: ArticleFormValues,
  article: ArticleDetail | undefined,
  resolvedSlug: string,
) {
  return {
    issueId: values.issueId,
    categoryId: values.categoryId,
    authorId: values.authorId,
    title: values.title,
    slug: resolvedSlug,
    excerptRich: values.excerptRich,
    contentRich: values.contentRich,
    imageUrl: values.imageUrl ? values.imageUrl : null,
    audioUrl: values.audioUrl ? values.audioUrl : null,
    audioChunks: values.audioChunksUrl
      ? values.audioChunksUrl
      : extractAudioChunksUrl(article?.audioChunks)
        ? null
        : undefined,
    status: values.status,
    publishedAt: resolvePublishedAtForStatus(values.status, article?.publishedAt ?? null),
    isFeatured: values.isFeatured,
  };
}

export function CmsArticleFormScreen({
  mode,
  articleId,
  initialData,
  initialOptionsData,
}: ArticleFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/articles");
  const text = i18n.cms;
  const formText = text.forms;
  const articleFormText = formText.resources.articles;

  const articleQuery = useArticleById(mode === "edit" ? articleId : undefined, { initialData });
  const tagOptionsQuery = useTagOptions({ initialData: initialOptionsData?.tagsOptions });
  const issueOptionsQuery = useIssueOptions({ initialData: initialOptionsData?.issuesOptions });
  const categoryOptionsQuery = useCategoryOptions({
    initialData: initialOptionsData?.categoriesOptions,
  });
  const userOptionsQuery = useUserOptions({ initialData: initialOptionsData?.authorsOptions });
  const createMutation = useArticleCreate();
  const updateMutation = useArticleUpdate();
  const syncTagsMutation = useArticleSyncTags();

  useSetCmsBreadcrumbLabel(mode === "edit" ? articleQuery.data?.title : null);

  if (mode === "edit" && !articleId) {
    return (
      <CmsErrorState
        title={articleFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && articleQuery.isPending) {
    return <CmsArticleFormLoading />;
  }

  if (mode === "edit" && articleQuery.isError) {
    const mapped = mapCrudDomainError(articleQuery.error, "articles");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const optionsError =
    (issueOptionsQuery.isError ? issueOptionsQuery.error : null) ??
    (categoryOptionsQuery.isError ? categoryOptionsQuery.error : null) ??
    (userOptionsQuery.isError ? userOptionsQuery.error : null) ??
    (tagOptionsQuery.isError ? tagOptionsQuery.error : null);

  if (optionsError) {
    const mapped = mapTrpcErrorToCmsUiMessage(optionsError);

    return (
      <CmsErrorState
        title={mapped.title}
        description={mapped.description}
        onRetry={
          mapped.retryable
            ? () => {
                void Promise.all([
                  issueOptionsQuery.refetch(),
                  categoryOptionsQuery.refetch(),
                  userOptionsQuery.refetch(),
                  tagOptionsQuery.refetch(),
                ]);
              }
            : undefined
        }
      />
    );
  }

  return (
    <ArticleFormContent
      key={mode === "edit" ? (articleQuery.data?.id ?? articleId) : "create"}
      mode={mode}
      articleId={articleId}
      article={articleQuery.data}
      tagsAvailable={tagOptionsQuery.data?.items ?? []}
      issuesAvailable={issueOptionsQuery.data?.items ?? []}
      categoriesAvailable={categoryOptionsQuery.data?.items ?? []}
      authorsAvailable={userOptionsQuery.data?.items ?? []}
      tagsLoading={tagOptionsQuery.isPending}
      issuesLoading={issueOptionsQuery.isPending}
      categoriesLoading={categoryOptionsQuery.isPending}
      authorsLoading={userOptionsQuery.isPending}
      isMutating={
        createMutation.isPending || updateMutation.isPending || syncTagsMutation.isPending
      }
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "articles.create");
        success(articleFormText.created);
      }}
      onUpdate={async ({ id, data, tagIds }) => {
        await updateMutation.mutateAsync({ id, data });

        if (tagIds) {
          try {
            await syncTagsMutation.mutateAsync({ id, data: { tagIds } });
          } catch (error) {
            const mapped = mapCrudDomainError(error, "articles");
            await invalidateAfterCmsMutation(trpcUtils, "articles.update", { id });
            cmsToast.error(articleFormText.syncTagsFailed(mapped.description), mapped.title);
            cancel();
            return;
          }
        }

        await invalidateAfterCmsMutation(trpcUtils, "articles.update", { id });
        success(articleFormText.updated);
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "articles");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

type ArticleFormContentProps = {
  mode: "create" | "edit";
  articleId?: string;
  article?: ArticleDetail;
  tagsAvailable: Array<{ id: string; name: string; slug: string }>;
  issuesAvailable: Array<{ id: string; title: string; slug: string }>;
  categoriesAvailable: Array<{ id: string; name: string }>;
  authorsAvailable: Array<{ id: string; name: string | null; email: string }>;
  tagsLoading: boolean;
  issuesLoading: boolean;
  categoriesLoading: boolean;
  authorsLoading: boolean;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateArticleInput) => Promise<void>;
  onUpdate: (payload: ArticleUpdatePayload) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

type ArticleUpdatePayload = {
  id: string;
  data: UpdateArticleInput;
  tagIds?: string[];
};

function ArticleFormContent({
  mode,
  articleId,
  article,
  tagsAvailable,
  issuesAvailable,
  categoriesAvailable,
  authorsAvailable,
  tagsLoading,
  issuesLoading,
  categoriesLoading,
  authorsLoading,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onMutationError,
  onValidationError,
}: ArticleFormContentProps) {
  const text = i18n.cms;
  const formText = text.forms;
  const articleFormText = formText.resources.articles;
  const fieldText = formText.fields;
  const listText = text.lists.articles;
  const commonText = text.common;
  const formFieldLabels = {
    issueId: fieldText.issue,
    categoryId: fieldText.category,
    authorId: fieldText.author,
    title: fieldText.title,
    slug: fieldText.slug,
    excerptRich: fieldText.excerpt,
    imageUrl: fieldText.imageUrl,
    audioUrl: fieldText.audioUrl,
    audioChunksUrl: fieldText.audioChunksUrl,
  };

  const payloadFieldLabels = {
    ...formFieldLabels,
    audioChunks: fieldText.audioChunksUrl,
  };

  const { control, getValues, handleSubmit, setValue } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleFormStateSchema),
    defaultValues: getArticleFormDefaultValues(article),
  });

  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);
  const [isJsonPickerOpen, setIsJsonPickerOpen] = useState(false);
  const initialAutoSlug = normalizeSlug(article?.title ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(article?.slug) && article?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const title = useWatch({ control, name: "title" }) ?? "";
  const manualSlug = useWatch({ control, name: "slug" }) ?? "";
  const imageUrl = useWatch({ control, name: "imageUrl" }) ?? "";
  const audioUrl = useWatch({ control, name: "audioUrl" }) ?? "";
  const audioChunksUrl = useWatch({ control, name: "audioChunksUrl" }) ?? "";
  const selectedTagIds = useWatch({ control, name: "tagIds" }) ?? [];

  const issueOptions = issuesAvailable.map((issue) => ({
    value: issue.id,
    label: `${issue.title} (${issue.slug})`,
  }));
  const categoryOptions = categoriesAvailable.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const userOptions = authorsAvailable.map((user) => ({
    value: user.id,
    label: user.name ? `${user.name} (${user.email})` : user.email,
  }));

  const statusOptions = [
    { value: "DRAFT", label: listText.statusDraft },
    { value: "PUBLISHED", label: listText.statusPublished },
    { value: "ARCHIVED", label: listText.statusArchived },
  ];

  const autoSlug = normalizeSlug(title);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || articleFormText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? articleFormText.slugManualHint
    : formText.generatedFromTitleHint;

  const openSlugEditor = () => {
    setValue("slug", resolvedSlug, { shouldDirty: true });
    setIsSlugEditing(true);
  };

  const regenerateSlugFromTitle = () => {
    setValue("slug", autoSlug, { shouldDirty: true, shouldValidate: true });
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };

  const toggleTag = (tagId: string, checked: boolean) => {
    const nextTagIds = checked
      ? selectedTagIds.includes(tagId)
        ? selectedTagIds
        : [...selectedTagIds, tagId]
      : selectedTagIds.filter((id) => id !== tagId);

    setValue("tagIds", nextTagIds, { shouldDirty: true, shouldValidate: true });
  };

  const handleValidSubmit = async (values: ArticleFormValues) => {
    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createArticleInputSchema,
          buildCreateArticlePayload(values, hasManualSlugOverride ? values.slug : autoSlug),
          payloadFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateArticleInputSchema,
        buildUpdateArticlePayload(values, article, hasManualSlugOverride ? values.slug : autoSlug),
        payloadFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      const tagsChanged = !tagIdsEqual(values.tagIds, article?.tagIds ?? []);

      await onUpdate({
        id: articleId!,
        data: validation.value,
        tagIds: tagsChanged ? values.tagIds : undefined,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  const handleInvalidSubmit = () => {
    const validation = validateFormInput(articleFormStateSchema, getValues(), formFieldLabels);

    if (!validation.ok) {
      onValidationError(validation.message);
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
    >
      <CmsPageHeader
        title={mode === "create" ? articleFormText.createTitle : articleFormText.editTitle}
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

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField label={fieldText.title} htmlFor="article-title" required>
            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <CmsTextInput
                  id="article-title"
                  value={field.value}
                  state={fieldState.error ? "error" : undefined}
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.slug} htmlFor="article-slug" required hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <Controller
                  name="slug"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsTextInput
                      id="article-slug"
                      className="flex-1"
                      value={field.value}
                      autoFocus
                      state={fieldState.error ? "error" : undefined}
                      onBlur={() => {
                        field.onBlur();
                        setIsSlugEditing(false);
                      }}
                      onChange={(event) => {
                        field.onChange(event.target.value);
                        setHasManualSlugOverride(true);
                      }}
                    />
                  )}
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
            label={articleFormText.contentFieldLabel}
            htmlFor="article-content-rich"
            required
            className="flex min-h-0 flex-1 flex-col"
          >
            <Controller
              name="contentRich"
              control={control}
              render={({ field }) => (
                <CmsRichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel={articleFormText.contentEditorAriaLabel}
                  fullHeight
                />
              )}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.excerpt} htmlFor="article-excerpt-rich">
            <Controller
              name="excerptRich"
              control={control}
              render={({ field }) => (
                <CmsRichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel={articleFormText.excerptEditorAriaLabel}
                />
              )}
            />
          </CmsFormField>
        </div>

        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {articleFormText.publishingSection}
            </div>

            {mode === "edit" ? (
              <div className="space-y-4">
                <CmsFormField label={listText.table.status} htmlFor="article-status" required>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field, fieldState }) => (
                      <CmsSelect
                        value={field.value}
                        state={fieldState.error ? "error" : undefined}
                        onValueChange={(value) => field.onChange(value as ArticleEditorialStatus)}
                        options={statusOptions}
                      />
                    )}
                  />
                </CmsFormField>

                <Controller
                  name="isFeatured"
                  control={control}
                  render={({ field }) => (
                    <CmsCheckbox
                      label={commonText.featured}
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            ) : (
              <div className="border border-dashed border-border px-3 py-2 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                {articleFormText.createStatusHint}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {articleFormText.relationsSection}
            </div>

            <div className="space-y-4">
              <CmsFormField label={fieldText.issue} htmlFor="article-issue" required>
                <Controller
                  name="issueId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsSearchSelect
                      value={field.value}
                      state={fieldState.error ? "error" : undefined}
                      onValueChange={field.onChange}
                      options={issueOptions}
                      disabled={issuesLoading}
                      loading={issuesLoading}
                    />
                  )}
                />
              </CmsFormField>

              <CmsFormField label={fieldText.category} htmlFor="article-category" required>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsSearchSelect
                      value={field.value}
                      state={fieldState.error ? "error" : undefined}
                      onValueChange={field.onChange}
                      options={categoryOptions}
                      disabled={categoriesLoading}
                      loading={categoriesLoading}
                    />
                  )}
                />
              </CmsFormField>

              <CmsFormField label={fieldText.author} htmlFor="article-author" required>
                <Controller
                  name="authorId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsSearchSelect
                      value={field.value}
                      state={fieldState.error ? "error" : undefined}
                      onValueChange={field.onChange}
                      options={userOptions}
                      disabled={authorsLoading}
                      loading={authorsLoading}
                    />
                  )}
                />
              </CmsFormField>
            </div>
          </section>

          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {articleFormText.tagsSection}
            </div>

            <CmsFormField label={articleFormText.tagsFieldLabel} htmlFor="article-tags">
              <ArticleTagsMultiSelect
                availableTags={tagsAvailable}
                selectedTagIds={selectedTagIds}
                disabled={isMutating}
                loading={tagsLoading}
                loadingText={articleFormText.tagsLoading}
                emptyText={articleFormText.noTagsAvailable}
                searchPlaceholder={articleFormText.tagSearchPlaceholder}
                searchEmptyText={articleFormText.tagSearchEmpty}
                triggerEmptyText={articleFormText.tagSelectEmpty}
                clearText={articleFormText.clearTags}
                selectedCountText={articleFormText.selectedTagsCount}
                onChange={toggleTag}
              />
            </CmsFormField>
          </section>

          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {articleFormText.mediaSection}
            </div>

            <div className="space-y-4">
              <CmsFormField label={fieldText.imageUrl} htmlFor="article-image-url">
                <div className="space-y-3">
                  {imageUrl ? (
                    <ArticleMediaFieldPreview kind="image" url={imageUrl} />
                  ) : (
                    <div className="flex aspect-16/10 items-center justify-center border border-dashed border-border bg-card-hover px-6 text-center">
                      <div className="space-y-1.5">
                        <CmsMetaText variant="category">
                          {articleFormText.imagePlaceholderTitle}
                        </CmsMetaText>
                        <CmsBody size="sm" tone="muted">
                          {articleFormText.imagePlaceholderDescription}
                        </CmsBody>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      disabled={isMutating}
                      onClick={() => setIsImagePickerOpen(true)}
                    >
                      {articleFormText.openImageLibrary}
                    </CmsActionButton>
                    {imageUrl ? (
                      <CmsActionButton
                        variant="ghost"
                        size="xs"
                        disabled={isMutating}
                        onClick={() =>
                          setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        {articleFormText.clearMediaField}
                      </CmsActionButton>
                    ) : null}
                  </div>
                </div>
              </CmsFormField>

              <CmsFormField label={fieldText.audioUrl} htmlFor="article-audio-url">
                <div className="space-y-3">
                  {audioUrl ? (
                    <ArticleMediaFieldPreview kind="audio" url={audioUrl} />
                  ) : (
                    <div className="flex aspect-16/10 items-center justify-center border border-dashed border-border bg-card-hover px-6 text-center">
                      <div className="space-y-1.5">
                        <CmsMetaText variant="category">
                          {articleFormText.audioPlaceholderTitle}
                        </CmsMetaText>
                        <CmsBody size="sm" tone="muted">
                          {articleFormText.audioPlaceholderDescription}
                        </CmsBody>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      disabled={isMutating}
                      onClick={() => setIsAudioPickerOpen(true)}
                    >
                      {articleFormText.openAudioLibrary}
                    </CmsActionButton>
                    {audioUrl ? (
                      <CmsActionButton
                        variant="ghost"
                        size="xs"
                        disabled={isMutating}
                        onClick={() =>
                          setValue("audioUrl", "", { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        {articleFormText.clearMediaField}
                      </CmsActionButton>
                    ) : null}
                  </div>
                </div>
              </CmsFormField>

              <CmsFormField label={fieldText.audioChunksUrl} htmlFor="article-audio-chunks-url">
                <div className="space-y-3">
                  {audioChunksUrl ? (
                    <ArticleMediaFieldPreview kind="json" url={audioChunksUrl} />
                  ) : (
                    <div className="flex aspect-16/10 items-center justify-center border border-dashed border-border bg-card-hover px-6 text-center">
                      <div className="space-y-1.5">
                        <CmsMetaText variant="category">
                          {articleFormText.jsonPlaceholderTitle}
                        </CmsMetaText>
                        <CmsBody size="sm" tone="muted">
                          {articleFormText.jsonPlaceholderDescription}
                        </CmsBody>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      disabled={isMutating}
                      onClick={() => setIsJsonPickerOpen(true)}
                    >
                      {articleFormText.openJsonLibrary}
                    </CmsActionButton>
                    {audioChunksUrl ? (
                      <CmsActionButton
                        variant="ghost"
                        size="xs"
                        disabled={isMutating}
                        onClick={() =>
                          setValue("audioChunksUrl", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        {articleFormText.clearMediaField}
                      </CmsActionButton>
                    ) : null}
                  </div>
                </div>
              </CmsFormField>
            </div>
          </section>
        </div>
      </div>

      <CmsMediaPickerDialog
        open={isImagePickerOpen}
        onOpenChange={setIsImagePickerOpen}
        title={articleFormText.imageLibraryTitle}
        description={articleFormText.imageLibraryDescription}
        selectActionLabel={articleFormText.selectImage}
        allowedKinds={["image"]}
        selectionMode="select-inline"
        onSelectUrl={(url) =>
          setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })
        }
      />

      <CmsMediaPickerDialog
        open={isAudioPickerOpen}
        onOpenChange={setIsAudioPickerOpen}
        title={articleFormText.audioLibraryTitle}
        description={articleFormText.audioLibraryDescription}
        selectActionLabel={articleFormText.selectAudio}
        allowedKinds={["audio"]}
        onSelectUrl={(url) =>
          setValue("audioUrl", url, { shouldDirty: true, shouldValidate: true })
        }
      />

      <CmsMediaPickerDialog
        open={isJsonPickerOpen}
        onOpenChange={setIsJsonPickerOpen}
        title={articleFormText.jsonLibraryTitle}
        description={articleFormText.jsonLibraryDescription}
        selectActionLabel={articleFormText.selectJson}
        allowedKinds={["json"]}
        onSelectUrl={(url) =>
          setValue("audioChunksUrl", url, { shouldDirty: true, shouldValidate: true })
        }
      />
    </form>
  );
}
