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
import { trpc } from "@/lib/trpc/react";

const articleFieldLabels = {
  issueId: "Issue",
  categoryId: "Categoria",
  authorId: "Autore",
  title: "Titolo",
  slug: "Slug",
  excerpt: "Excerpt",
  imageUrl: "Image URL",
  audioUrl: "Audio URL",
};

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type ArticleFormScreenProps = {
  mode: "create" | "edit";
  articleId?: string;
  initialData?: ArticleDetail;
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

export function CmsArticleFormScreen({ mode, articleId, initialData }: ArticleFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/articles");
  const text = i18n.cms;

  const articleQuery = useArticleById(mode === "edit" ? articleId : undefined, { initialData });
  const tagOptionsQuery = useTagOptions();
  const issueOptionsQuery = useIssueOptions();
  const categoryOptionsQuery = useCategoryOptions();
  const userOptionsQuery = useUserOptions();
  const createMutation = useArticleCreate();
  const updateMutation = useArticleUpdate();
  const syncTagsMutation = useArticleSyncTags();

  useSetCmsBreadcrumbLabel(mode === "edit" ? articleQuery.data?.title : null);

  if (mode === "edit" && !articleId) {
    return <CmsErrorState title="Articolo non valido" description="ID mancante per la modifica." />;
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
        success("Articolo creato.");
      }}
      onUpdate={async ({ id, data, tagIds }) => {
        await updateMutation.mutateAsync({ id, data });

        if (tagIds) {
          await syncTagsMutation.mutateAsync({ id, data: { tagIds } });
        }

        await invalidateAfterCmsMutation(trpcUtils, "articles.update", { id });
        success("Articolo aggiornato.");
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

function buildPayload(input: {
  issueId: string;
  categoryId: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt: string;
  contentRich: unknown;
  imageUrl: string;
  audioUrl: string;
  audioChunks: unknown;
}) {
  return {
    issueId: input.issueId,
    categoryId: input.categoryId,
    authorId: input.authorId,
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt || undefined,
    contentRich: input.contentRich,
    imageUrl: input.imageUrl || undefined,
    audioUrl: input.audioUrl || undefined,
    audioChunks: input.audioChunks ?? undefined,
  };
}

function ArticleFormContent({
  mode,
  articleId,
  article,
  tagsAvailable,
  issuesAvailable,
  categoriesAvailable,
  authorsAvailable,
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

  const handleSubmit = async () => {
    const parsedAudioChunks = parseJsonOrUndefined(audioChunks);

    if (audioChunks.trim() && parsedAudioChunks == null) {
      onValidationError("audioChunks deve essere JSON valido.");
      return;
    }

    const payload = buildPayload({
      issueId,
      categoryId,
      authorId,
      title,
      slug,
      excerpt,
      contentRich,
      imageUrl,
      audioUrl,
      audioChunks: parsedAudioChunks,
    });

    try {
      if (mode === "create") {
        const validation = validateFormInput(createArticleInputSchema, payload, articleFieldLabels);

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(updateArticleInputSchema, payload, articleFieldLabels);

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
      <CmsPageHeader title={mode === "create" ? "Nuovo Articolo" : "Modifica Articolo"} />

      <div className="space-y-4 border border-foreground p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <CmsFormField label="Issue" htmlFor="article-issue" required>
            <CmsSelect
              value={issueId}
              onValueChange={setIssueId}
              options={issueOptions}
              disabled={issuesLoading}
            />
          </CmsFormField>

          <CmsFormField label="Categoria" htmlFor="article-category" required>
            <CmsSelect
              value={categoryId}
              onValueChange={setCategoryId}
              options={categoryOptions}
              disabled={categoriesLoading}
            />
          </CmsFormField>

          <CmsFormField label="Autore" htmlFor="article-author" required>
            <CmsSelect
              value={authorId}
              onValueChange={setAuthorId}
              options={userOptions}
              disabled={authorsLoading}
            />
          </CmsFormField>
        </div>

        <CmsFormField label="Titolo" htmlFor="article-title" required>
          <CmsTextInput
            id="article-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Slug" htmlFor="article-slug" required>
          <CmsTextInput
            id="article-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Excerpt" htmlFor="article-excerpt">
          <CmsTextarea
            id="article-excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Contenuto" htmlFor="article-content-rich" required>
          <CmsRichTextEditor
            value={contentRich}
            onChange={setContentRich}
            ariaLabel="Editor contenuto articolo"
          />
        </CmsFormField>

        <div className="grid gap-4 md:grid-cols-2">
          <CmsFormField label="Image URL" htmlFor="article-image-url">
            <CmsTextInput
              id="article-image-url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField label="Audio URL" htmlFor="article-audio-url">
            <CmsTextInput
              id="article-audio-url"
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
            />
          </CmsFormField>
        </div>

        <CmsFormField label="audioChunks (JSON)" htmlFor="article-audio-chunks">
          <CmsTextarea
            id="article-audio-chunks"
            value={audioChunks}
            onChange={(event) => setAudioChunks(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Tag" htmlFor="article-tags">
          <div id="article-tags" className="space-y-2">
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

            {tagsAvailable.length === 0 ? <p className="text-sm">Nessun tag disponibile.</p> : null}
          </div>
        </CmsFormField>

        <div className="flex items-center gap-2">
          <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
            {text.common.cancel}
          </CmsActionButton>
          <CmsActionButton onClick={() => void handleSubmit()} isLoading={isMutating}>
            {mode === "create" ? text.forms.create : text.forms.save}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
