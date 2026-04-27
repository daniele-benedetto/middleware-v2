"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsCheckbox,
  CmsFormField,
  CmsPageHeader,
  CmsTextInput,
  CmsTextarea,
  cmsToast,
} from "@/components/cms/primitives";
import {
  useArticleById,
  useArticleCreate,
  useArticleSyncTags,
  useArticleUpdate,
  useTagOptions,
} from "@/features/cms/articles/hooks/use-article-crud";
import { mapCrudDomainError, useCmsFormNavigation } from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type ArticleFormScreenProps = {
  mode: "create" | "edit";
  articleId?: string;
};

const defaultJson = JSON.stringify({ type: "doc", content: [] });

export function CmsArticleFormScreen({ mode, articleId }: ArticleFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/articles");
  const text = i18n.cms;

  const articleQuery = useArticleById(mode === "edit" ? articleId : undefined);
  const tagOptionsQuery = useTagOptions();
  const createMutation = useArticleCreate();
  const updateMutation = useArticleUpdate();
  const syncTagsMutation = useArticleSyncTags();

  const [issueId, setIssueId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentRich, setContentRich] = useState(mode === "create" ? defaultJson : "");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioChunks, setAudioChunks] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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

  const isPending =
    createMutation.isPending || updateMutation.isPending || syncTagsMutation.isPending;
  const tags = tagOptionsQuery.data?.items ?? [];

  const toggleTag = (tagId: string, checked: boolean) => {
    setSelectedTagIds((current) => {
      if (checked) {
        return current.includes(tagId) ? current : [...current, tagId];
      }

      return current.filter((id) => id !== tagId);
    });
  };

  const parseJsonOrUndefined = (value: string) => {
    if (!value.trim()) {
      return undefined;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    const resolvedIssueId = issueId || articleQuery.data?.issueId || "";
    const resolvedCategoryId = categoryId || articleQuery.data?.categoryId || "";
    const resolvedAuthorId = authorId || articleQuery.data?.authorId || "";
    const resolvedTitle = title || articleQuery.data?.title || "";
    const resolvedSlug = slug || articleQuery.data?.slug || "";

    if (
      !resolvedIssueId ||
      !resolvedCategoryId ||
      !resolvedAuthorId ||
      !resolvedTitle.trim() ||
      !resolvedSlug.trim()
    ) {
      cmsToast.error(
        "Issue, categoria, autore, titolo e slug sono obbligatori.",
        text.trpcErrors.badRequestTitle,
      );
      return;
    }

    const parsedContentRich = parseJsonOrUndefined(contentRich);

    if (mode === "create" && parsedContentRich == null) {
      cmsToast.error("contentRich deve essere JSON valido.", text.trpcErrors.badRequestTitle);
      return;
    }

    if (mode === "edit" && contentRich.trim() && parsedContentRich == null) {
      cmsToast.error("contentRich deve essere JSON valido.", text.trpcErrors.badRequestTitle);
      return;
    }

    const parsedAudioChunks = parseJsonOrUndefined(audioChunks);

    if (audioChunks.trim() && parsedAudioChunks == null) {
      cmsToast.error("audioChunks deve essere JSON valido.", text.trpcErrors.badRequestTitle);
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          issueId: resolvedIssueId,
          categoryId: resolvedCategoryId,
          authorId: resolvedAuthorId,
          title: resolvedTitle,
          slug: resolvedSlug,
          excerpt: excerpt || undefined,
          contentRich: parsedContentRich,
          imageUrl: imageUrl || undefined,
          audioUrl: audioUrl || undefined,
          audioChunks: parsedAudioChunks,
        });
        await invalidateAfterCmsMutation(trpcUtils, "articles.create");
        success("Articolo creato.");
        return;
      }

      await updateMutation.mutateAsync({
        id: articleId!,
        data: {
          issueId: resolvedIssueId,
          categoryId: resolvedCategoryId,
          authorId: resolvedAuthorId,
          title: resolvedTitle,
          slug: resolvedSlug,
          excerpt: excerpt || undefined,
          contentRich: parsedContentRich,
          imageUrl: imageUrl || undefined,
          audioUrl: audioUrl || undefined,
          audioChunks: parsedAudioChunks,
        },
      });

      if (selectedTagIds.length > 0) {
        await syncTagsMutation.mutateAsync({
          id: articleId!,
          data: { tagIds: selectedTagIds },
        });
      }

      await invalidateAfterCmsMutation(trpcUtils, "articles.update", { id: articleId });
      success("Articolo aggiornato.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "articles");
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader title={mode === "create" ? "Nuovo Articolo" : "Modifica Articolo"} />

      <div className="space-y-4 border border-foreground p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <CmsFormField label="Issue ID" htmlFor="article-issue" required>
            <CmsTextInput
              id="article-issue"
              value={issueId || articleQuery.data?.issueId || ""}
              onChange={(event) => setIssueId(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField label="Category ID" htmlFor="article-category" required>
            <CmsTextInput
              id="article-category"
              value={categoryId || articleQuery.data?.categoryId || ""}
              onChange={(event) => setCategoryId(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField label="Author ID" htmlFor="article-author" required>
            <CmsTextInput
              id="article-author"
              value={authorId || articleQuery.data?.authorId || ""}
              onChange={(event) => setAuthorId(event.target.value)}
            />
          </CmsFormField>
        </div>

        <CmsFormField label="Titolo" htmlFor="article-title" required>
          <CmsTextInput
            id="article-title"
            value={title || articleQuery.data?.title || ""}
            onChange={(event) => setTitle(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Slug" htmlFor="article-slug" required>
          <CmsTextInput
            id="article-slug"
            value={slug || articleQuery.data?.slug || ""}
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

        <CmsFormField label="contentRich (JSON)" htmlFor="article-content-rich" required>
          <CmsTextarea
            id="article-content-rich"
            value={contentRich}
            onChange={(event) => setContentRich(event.target.value)}
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
            {tags.map((tag) => {
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

            {tags.length === 0 ? <p className="text-sm">Nessun tag disponibile.</p> : null}
          </div>
        </CmsFormField>

        <div className="flex items-center gap-2">
          <CmsActionButton variant="outline" onClick={cancel} disabled={isPending}>
            {text.common.cancel}
          </CmsActionButton>
          <CmsActionButton onClick={() => void handleSubmit()} isLoading={isPending}>
            {mode === "create" ? "Crea" : "Salva"}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
