"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsSelect,
  CmsTextInput,
  CmsTextarea,
  cmsToast,
} from "@/components/cms/primitives";
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
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  createArticleInputSchema,
  updateArticleInputSchema,
} from "@/lib/server/modules/articles/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";

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

function stringifyAudioChunks(value: unknown): string {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseJsonOrUndefined(value: string): unknown {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function tagIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
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
    return <CmsLoadingState />;
  }

  if (mode === "edit" && articleQuery.isError) {
    const mapped = mapCrudDomainError(articleQuery.error, "articles");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  return (
    <ArticleFormContent
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
          await syncTagsMutation.mutateAsync({ id, data: { tagIds } });
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
  const articleFieldLabels = {
    issueId: fieldText.issue,
    categoryId: fieldText.category,
    authorId: fieldText.author,
    title: fieldText.title,
    slug: fieldText.slug,
    excerpt: fieldText.excerpt,
    imageUrl: fieldText.imageUrl,
    audioUrl: fieldText.audioUrl,
  };

  const [issueId, setIssueId] = useState(article?.issueId ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [authorId, setAuthorId] = useState(article?.authorId ?? "");
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [contentRich, setContentRich] = useState<unknown>(article?.contentRich ?? emptyContentDoc);
  const [imageUrl, setImageUrl] = useState(article?.imageUrl ?? "");
  const [audioUrl, setAudioUrl] = useState(article?.audioUrl ?? "");
  const [audioChunks, setAudioChunks] = useState(stringifyAudioChunks(article?.audioChunks));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(article?.tagIds ?? []);

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

  const regenerateSlugFromTitle = () => {
    setSlug(normalizeSlug(title));
  };

  const handleSubmit = async () => {
    const parsedAudioChunks = parseJsonOrUndefined(audioChunks);

    if (audioChunks.trim() && parsedAudioChunks == null) {
      onValidationError(articleFormText.invalidAudioChunks);
      return;
    }

    const basePayload = {
      issueId,
      categoryId,
      authorId,
      title,
      slug,
      contentRich,
    };

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createArticleInputSchema,
          {
            ...basePayload,
            excerpt: excerpt || undefined,
            imageUrl: imageUrl || undefined,
            audioUrl: audioUrl || undefined,
            audioChunks: parsedAudioChunks ?? undefined,
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
          excerpt: excerpt ? excerpt : null,
          imageUrl: imageUrl ? imageUrl : null,
          audioUrl: audioUrl ? audioUrl : null,
          audioChunks: audioChunks.trim() ? parsedAudioChunks : null,
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
    <div className="space-y-6">
      <CmsPageHeader
        title={mode === "create" ? articleFormText.createTitle : articleFormText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton onClick={() => void handleSubmit()} isLoading={isMutating}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="space-y-4 border border-foreground p-4">
        <div className="grid gap-4 md:grid-cols-3">
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

        <CmsFormField label={fieldText.title} htmlFor="article-title" required>
          <CmsTextInput
            id="article-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label={fieldText.slug} htmlFor="article-slug" required>
          <div className="flex items-center gap-2">
            <CmsTextInput
              id="article-slug"
              className="flex-1"
              value={slug}
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

        <CmsFormField label={fieldText.excerpt} htmlFor="article-excerpt">
          <CmsTextarea
            id="article-excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label={fieldText.content} htmlFor="article-content-rich" required>
          <CmsRichTextEditor
            value={contentRich}
            onChange={setContentRich}
            ariaLabel="Editor contenuto articolo"
          />
        </CmsFormField>

        <div className="grid gap-4 md:grid-cols-2">
          <CmsFormField label={fieldText.imageUrl} htmlFor="article-image-url">
            <CmsTextInput
              id="article-image-url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.audioUrl} htmlFor="article-audio-url">
            <CmsTextInput
              id="article-audio-url"
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
            />
          </CmsFormField>
        </div>

        <CmsFormField label={fieldText.audioChunksJson} htmlFor="article-audio-chunks">
          <CmsTextarea
            id="article-audio-chunks"
            value={audioChunks}
            onChange={(event) => setAudioChunks(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label={fieldText.tags} htmlFor="article-tags">
          <div id="article-tags" className="space-y-2">
            {tagsLoading ? <p className="text-sm">{articleFormText.tagsLoading}</p> : null}
            {tagsAvailable.map((tag) => {
              const checked = selectedTagIds.includes(tag.id);

              return (
                <CmsCheckbox
                  key={tag.id}
                  checked={checked}
                  onChange={(value) => toggleTag(tag.id, value)}
                  label={`${tag.name} (${tag.slug})`}
                />
              );
            })}

            {!tagsLoading && tagsAvailable.length === 0 ? (
              <p className="text-sm">{articleFormText.noTagsAvailable}</p>
            ) : null}
          </div>
        </CmsFormField>
      </div>
    </div>
  );
}
