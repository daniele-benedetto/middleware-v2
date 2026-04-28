"use client";

import { useEffect, useRef, useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import { useSetCmsBreadcrumbLabel } from "@/components/cms/layout";
import {
  CmsActionButton,
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
  type IssueDetail,
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

const issueFieldLabels = {
  title: "Titolo",
  slug: "Slug",
  description: "Descrizione",
};

type IssueFormScreenProps = {
  mode: "create" | "edit";
  issueId?: string;
  initialData?: IssueDetail;
};

function orderedIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

export function CmsIssueFormScreen({ mode, issueId, initialData }: IssueFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/issues");
  const text = i18n.cms;
  const issueQuery = useIssueById(mode === "edit" ? issueId : undefined, { initialData });
  const createMutation = useIssueCreate();
  const updateMutation = useIssueUpdate();
  const reorderMutation = useArticlesReorder();

  useSetCmsBreadcrumbLabel(mode === "edit" ? issueQuery.data?.title : null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [orderedArticleIds, setOrderedArticleIds] = useState<string[]>([]);
  const initialOrderRef = useRef<string[]>([]);

  useEffect(() => {
    if (mode !== "edit") return;
    const items = issueQuery.data?.articles ?? [];
    if (!items) return;
    const ids = items.map((article) => article.id);
    if (orderedIdsEqual(ids, initialOrderRef.current)) return;

    initialOrderRef.current = ids;
    setOrderedArticleIds(ids);
  }, [mode, issueQuery.data?.articles]);

  if (mode === "edit" && !issueId) {
    return <CmsErrorState title="Issue non valida" description="ID mancante per la modifica." />;
  }

  if (mode === "edit" && issueQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && issueQuery.isError) {
    const mapped = mapCrudDomainError(issueQuery.error, "issues");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const isPending =
    createMutation.isPending || updateMutation.isPending || reorderMutation.isPending;

  const articlesById = new Map(
    (issueQuery.data?.articles ?? []).map((article) => [article.id, article]),
  );
  const orderedArticles = orderedArticleIds
    .map((id) => articlesById.get(id))
    .filter((article): article is NonNullable<typeof article> => Boolean(article));

  const regenerateSlugFromTitle = () => {
    const next = normalizeSlug(title || issueQuery.data?.title || "");
    setSlug(next);
  };

  const handleSubmit = async () => {
    const resolvedTitle = title || issueQuery.data?.title || "";
    const resolvedSlug = slug || (mode === "create" ? undefined : issueQuery.data?.slug);
    const resolvedDescription = description || issueQuery.data?.description || "";

    const payload = {
      title: resolvedTitle,
      slug: resolvedSlug || undefined,
      description: resolvedDescription || undefined,
    };

    try {
      if (mode === "create") {
        const validation = validateFormInput(createIssueInputSchema, payload, issueFieldLabels);

        if (!validation.ok) {
          cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
          return;
        }

        await createMutation.mutateAsync(validation.value);
        await invalidateAfterCmsMutation(trpcUtils, "issues.create");
        success("Issue creata.");
        return;
      }

      const validation = validateFormInput(updateIssueInputSchema, payload, issueFieldLabels);

      if (!validation.ok) {
        cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
        return;
      }

      await updateMutation.mutateAsync({
        id: issueId!,
        data: validation.value,
      });

      const orderChanged = !orderedIdsEqual(orderedArticleIds, initialOrderRef.current);

      if (orderChanged && orderedArticleIds.length > 0) {
        try {
          await reorderMutation.mutateAsync({
            issueId: issueId!,
            orderedArticleIds,
          });
          initialOrderRef.current = orderedArticleIds;
        } catch (error) {
          const mapped = mapCrudDomainError(error, "articles");
          cmsToast.error(
            `Issue salvata, riordino articoli fallito: ${mapped.description}`,
            mapped.title,
          );
          await invalidateAfterCmsMutation(trpcUtils, "issues.update", { id: issueId });
          return;
        }
      }

      await invalidateAfterCmsMutation(trpcUtils, "issues.update", { id: issueId });
      success("Issue aggiornata.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "issues");
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader title={mode === "create" ? "Nuova Issue" : "Modifica Issue"} />

      <div className={mode === "edit" ? "grid gap-6 lg:grid-cols-[1fr_360px]" : "grid gap-6"}>
        <div className="space-y-4 border border-foreground p-4">
          <CmsFormField label="Titolo" htmlFor="issue-title" required>
            <CmsTextInput
              id="issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField
            label="Slug"
            htmlFor="issue-slug"
            required={mode === "edit"}
            hint={mode === "create" ? "Generato dal titolo se vuoto" : undefined}
          >
            <div className="flex items-center gap-2">
              <CmsTextInput
                id="issue-slug"
                className="flex-1"
                value={slug}
                placeholder={mode === "create" ? "auto da titolo" : undefined}
                onChange={(event) => setSlug(event.target.value)}
              />
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={regenerateSlugFromTitle}
                  className="shrink-0 font-ui text-[10px] uppercase tracking-[0.06em] text-muted-foreground hover:text-accent"
                >
                  Rigenera
                </button>
              ) : null}
            </div>
          </CmsFormField>

          <CmsFormField label="Descrizione" htmlFor="issue-description">
            <CmsTextarea
              id="issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </CmsFormField>

          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={cancel} disabled={isPending}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton onClick={() => void handleSubmit()} isLoading={isPending}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        </div>

        {mode === "edit" ? (
          <IssueArticlesPanel
            articles={orderedArticles}
            onReorder={setOrderedArticleIds}
            disabled={isPending}
          />
        ) : null}
      </div>
    </div>
  );
}
