"use client";

import { Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { CmsErrorState } from "@/components/cms/common";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
import {
  CmsActionButton,
  CmsBody,
  CmsCheckbox,
  CmsFormField,
  CmsMetaText,
  CmsPageHeader,
  CmsRemovableTag,
  CmsRichTextEditor,
  CmsSearchBar,
  CmsSelect,
  CmsTextInput,
  cmsToast,
} from "@/components/cms/primitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CmsArticleFormLoading } from "@/features/cms/articles/components/article-form-loading";
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
import { CmsMediaImage } from "@/features/cms/media/components/media-image";
import { CmsMediaPickerDialog } from "@/features/cms/media/components/media-picker-dialog";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { extractCmsMediaPathname, resolveCmsMediaPreviewUrl } from "@/lib/media/blob";
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
type ArticleTagOption = { id: string; name: string; slug: string };

function tagIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function ArticleImagePreview({ url }: { url: string }) {
  const pathname = extractCmsMediaPathname(url);

  return (
    <div className="relative aspect-16/10 overflow-hidden border border-foreground bg-card-hover">
      {pathname ? (
        <CmsMediaImage
          pathname={pathname}
          alt="Article image preview"
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-cover"
        />
      ) : (
        <Image
          fill
          src={url}
          alt="Article image preview"
          sizes="(max-width: 1024px) 100vw, 40vw"
          unoptimized
          className="object-cover"
        />
      )}
    </div>
  );
}

function ArticleAudioPreview({ url }: { url: string }) {
  return (
    <div className="border border-foreground bg-card-hover p-4">
      <audio controls preload="metadata" className="w-full" src={resolveCmsMediaPreviewUrl(url)}>
        Audio preview
      </audio>
    </div>
  );
}

function ArticleJsonPreview({ url }: { url: string }) {
  const mediaText = i18n.cms.lists.media;
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(resolveCmsMediaPreviewUrl(url), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(mediaText.previewError);
        }

        const text = await response.text();

        try {
          setContent(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setContent(text);
        }
      })
      .catch((nextError) => {
        if (!controller.signal.aborted) {
          setError(nextError instanceof Error ? nextError.message : mediaText.previewError);
        }
      });

    return () => {
      controller.abort();
    };
  }, [mediaText.previewError, url]);

  return (
    <div className="space-y-2 border border-foreground bg-card-hover p-4">
      <CmsMetaText variant="category">{mediaText.jsonPreviewLabel}</CmsMetaText>
      {error ? (
        <CmsBody size="sm" tone="accent">
          {error}
        </CmsBody>
      ) : content ? (
        <pre className="max-h-72 overflow-auto bg-white p-4 font-ui text-[12px] leading-[1.55] text-foreground whitespace-pre-wrap wrap-break-word">
          {content}
        </pre>
      ) : (
        <div className="font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
          {mediaText.previewLoading}
        </div>
      )}
    </div>
  );
}

function ArticleMediaFieldPreview({
  kind,
  url,
}: {
  kind: "image" | "audio" | "json";
  url: string;
}) {
  if (!url) {
    return null;
  }

  if (kind === "image") {
    return <ArticleImagePreview key={url} url={url} />;
  }

  if (kind === "audio") {
    return <ArticleAudioPreview key={url} url={url} />;
  }

  return <ArticleJsonPreview key={url} url={url} />;
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

function ArticleTagsMultiSelect({
  availableTags,
  selectedTagIds,
  disabled,
  loading,
  loadingText,
  emptyText,
  searchPlaceholder,
  searchEmptyText,
  triggerEmptyText,
  clearText,
  selectedCountText,
  onChange,
}: {
  availableTags: ArticleTagOption[];
  selectedTagIds: string[];
  disabled: boolean;
  loading: boolean;
  loadingText: string;
  emptyText: string;
  searchPlaceholder: string;
  searchEmptyText: string;
  triggerEmptyText: string;
  clearText: string;
  selectedCountText: (count: number) => string;
  onChange: (tagId: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredTags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return availableTags;
    }

    return availableTags.filter((tag) => {
      return (
        tag.name.toLowerCase().includes(normalizedQuery) ||
        tag.slug.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [availableTags, query]);

  const selectedTags = useMemo(() => {
    const selectedIds = new Set(selectedTagIds);
    return availableTags.filter((tag) => selectedIds.has(tag.id));
  }, [availableTags, selectedTagIds]);

  const triggerLabel = loading
    ? loadingText
    : selectedTagIds.length > 0
      ? selectedCountText(selectedTagIds.length)
      : triggerEmptyText;

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              id="article-tags"
              type="button"
              disabled={disabled || loading}
              className={cn(
                "flex min-h-10 w-full items-center justify-between border border-foreground bg-white px-3 text-left",
                "font-ui text-[12px] uppercase tracking-[0.04em] transition-colors hover:bg-card-hover",
                (disabled || loading) &&
                  "cursor-not-allowed border-border bg-card-hover text-border hover:bg-card-hover",
              )}
            />
          }
        >
          <span
            className={selectedTagIds.length > 0 && !loading ? "text-foreground" : "text-border"}
          >
            {triggerLabel}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </PopoverTrigger>

        <PopoverContent className="w-(--anchor-width) max-w-88 border-0 p-0">
          {availableTags.length > 0 ? (
            <CmsSearchBar
              className="border-0 p-0 focus-within:border-0 [&>div]:border-b-0 [&>div>div]:border-r-0 [&>div>div_svg]:text-foreground"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              active={Boolean(query)}
              resultsSlot={
                <div className="max-h-64 overflow-y-auto">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((tag) => {
                      const checked = selectedTagIds.includes(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => onChange(tag.id, !checked)}
                          className={cn(
                            "flex w-full items-center justify-between border-b border-card-hover px-3.5 py-2 text-left last:border-b-0",
                            "font-ui text-[11px] uppercase tracking-[0.04em]",
                            checked
                              ? "bg-card-hover text-foreground"
                              : "bg-white text-muted-foreground hover:bg-card-hover hover:text-foreground",
                          )}
                        >
                          <span>
                            {tag.name}
                            <span className="ml-2 text-[10px] text-border">{tag.slug}</span>
                          </span>
                          {checked ? <Check className="size-3.5 text-accent" /> : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-3 font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                      {searchEmptyText}
                    </div>
                  )}
                </div>
              }
            />
          ) : (
            <div className="font-ui text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
              {loading ? loadingText : emptyText}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <CmsRemovableTag key={tag.id} onRemove={() => onChange(tag.id, false)}>
              {tag.name}
            </CmsRemovableTag>
          ))}

          {selectedTags.length > 1 ? (
            <CmsActionButton
              variant="ghost"
              size="xs"
              onClick={() => selectedTagIds.forEach((id) => onChange(id, false))}
            >
              {clearText}
            </CmsActionButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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
  const articleFieldLabels = {
    issueId: fieldText.issue,
    categoryId: fieldText.category,
    authorId: fieldText.author,
    title: fieldText.title,
    slug: fieldText.slug,
    excerptRich: fieldText.excerpt,
    imageUrl: fieldText.imageUrl,
    audioUrl: fieldText.audioUrl,
    audioChunks: fieldText.audioChunksUrl,
  };

  const [issueId, setIssueId] = useState(article?.issueId ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [authorId, setAuthorId] = useState(article?.authorId ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerptRich, setExcerptRich] = useState<unknown>(article?.excerptRich ?? emptyContentDoc);
  const [contentRich, setContentRich] = useState<unknown>(article?.contentRich ?? emptyContentDoc);
  const [imageUrl, setImageUrl] = useState(article?.imageUrl ?? "");
  const [audioUrl, setAudioUrl] = useState(article?.audioUrl ?? "");
  const [audioChunksUrl, setAudioChunksUrl] = useState(extractAudioChunksUrl(article?.audioChunks));
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);
  const [isJsonPickerOpen, setIsJsonPickerOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(article?.tagIds ?? []);
  const [status, setStatus] = useState<ArticleEditorialStatus>(article?.status ?? "DRAFT");
  const [isFeatured, setIsFeatured] = useState(article?.isFeatured ?? false);

  const initialAutoSlug = useMemo(() => normalizeSlug(article?.title ?? ""), [article?.title]);
  const [manualSlug, setManualSlug] = useState(article?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(article?.slug) && article?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const toggleTag = (tagId: string, checked: boolean) => {
    setSelectedTagIds((current) => {
      if (checked) {
        return current.includes(tagId) ? current : [...current, tagId];
      }
      return current.filter((id) => id !== tagId);
    });
  };

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
    setManualSlug(resolvedSlug);
    setIsSlugEditing(true);
  };

  const regenerateSlugFromTitle = () => {
    setManualSlug(autoSlug);
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };

  const handleSubmit = async () => {
    if (!isValidOptionalUrl(audioChunksUrl)) {
      onValidationError(`${fieldText.audioChunksUrl}: URL non valido.`);
      return;
    }

    const basePayload = {
      issueId,
      categoryId,
      authorId,
      title,
      slug: hasManualSlugOverride ? manualSlug : resolvedSlug,
      excerptRich,
      contentRich,
    };

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createArticleInputSchema,
          {
            ...basePayload,
            imageUrl: imageUrl || undefined,
            audioUrl: audioUrl || undefined,
            audioChunks: audioChunksUrl || undefined,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          },
          articleFieldLabels,
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
        {
          ...basePayload,
          imageUrl: imageUrl ? imageUrl : null,
          audioUrl: audioUrl ? audioUrl : null,
          audioChunks: audioChunksUrl
            ? audioChunksUrl
            : extractAudioChunksUrl(article?.audioChunks)
              ? null
              : undefined,
          status,
          publishedAt: resolvePublishedAtForStatus(status, article?.publishedAt ?? null),
          isFeatured,
        },
        articleFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      const tagsChanged = !tagIdsEqual(selectedTagIds, article?.tagIds ?? []);

      await onUpdate({
        id: articleId!,
        data: validation.value,
        tagIds: tagsChanged ? selectedTagIds : undefined,
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
        <div className="cms-scroll min-h-0 min-w-0 space-y-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField label={fieldText.title} htmlFor="article-title" required>
            <CmsTextInput
              id="article-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.slug} htmlFor="article-slug" required hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <CmsTextInput
                  id="article-slug"
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
            label={articleFormText.contentFieldLabel}
            htmlFor="article-content-rich"
            required
          >
            <CmsRichTextEditor
              value={contentRich}
              onChange={setContentRich}
              ariaLabel={articleFormText.contentEditorAriaLabel}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.excerpt} htmlFor="article-excerpt-rich">
            <CmsRichTextEditor
              value={excerptRich}
              onChange={setExcerptRich}
              ariaLabel={articleFormText.excerptEditorAriaLabel}
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
                  <CmsSelect
                    value={status}
                    onValueChange={(value) => setStatus(value as ArticleEditorialStatus)}
                    options={statusOptions}
                  />
                </CmsFormField>

                <CmsCheckbox
                  label={commonText.featured}
                  checked={isFeatured}
                  onChange={setIsFeatured}
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
                <CmsSelect
                  value={issueId}
                  onValueChange={setIssueId}
                  options={issueOptions}
                  disabled={issuesLoading}
                />
              </CmsFormField>

              <CmsFormField label={fieldText.category} htmlFor="article-category" required>
                <CmsSelect
                  value={categoryId}
                  onValueChange={setCategoryId}
                  options={categoryOptions}
                  disabled={categoriesLoading}
                />
              </CmsFormField>

              <CmsFormField label={fieldText.author} htmlFor="article-author" required>
                <CmsSelect
                  value={authorId}
                  onValueChange={setAuthorId}
                  options={userOptions}
                  disabled={authorsLoading}
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
                        onClick={() => setImageUrl("")}
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
                        onClick={() => setAudioUrl("")}
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
                        onClick={() => setAudioChunksUrl("")}
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
        onSelectUrl={setImageUrl}
      />

      <CmsMediaPickerDialog
        open={isAudioPickerOpen}
        onOpenChange={setIsAudioPickerOpen}
        title={articleFormText.audioLibraryTitle}
        description={articleFormText.audioLibraryDescription}
        selectActionLabel={articleFormText.selectAudio}
        allowedKinds={["audio"]}
        onSelectUrl={setAudioUrl}
      />

      <CmsMediaPickerDialog
        open={isJsonPickerOpen}
        onOpenChange={setIsJsonPickerOpen}
        title={articleFormText.jsonLibraryTitle}
        description={articleFormText.jsonLibraryDescription}
        selectActionLabel={articleFormText.selectJson}
        allowedKinds={["json"]}
        onSelectUrl={setAudioChunksUrl}
      />
    </form>
  );
}
