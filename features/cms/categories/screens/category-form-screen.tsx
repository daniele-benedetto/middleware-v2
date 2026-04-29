"use client";

import { useMemo, useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import { CmsArticleListPanel } from "@/components/cms/common/article-list-panel";
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
import {
  useCategoryById,
  useCategoryCreate,
  useCategoryUpdate,
  type CategoryDetail,
} from "@/features/cms/categories/hooks/use-category-crud";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories/schema";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { RouterInputs } from "@/lib/trpc/types";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type CategoryFormScreenProps = {
  mode: "create" | "edit";
  categoryId?: string;
  initialData?: CategoryDetail;
};

type CategoryCreateInput = RouterInputs["categories"]["create"];
type CategoryUpdateInput = RouterInputs["categories"]["update"]["data"];

type CategoryFormContentProps = {
  mode: "create" | "edit";
  categoryId?: string;
  category?: CategoryDetail;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: CategoryCreateInput) => Promise<void>;
  onUpdate: (payload: { id: string; data: CategoryUpdateInput }) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

export function CmsCategoryFormScreen({ mode, categoryId, initialData }: CategoryFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/categories");
  const text = i18n.cms;
  const formText = text.forms;
  const categoryFormText = formText.resources.categories;
  const categoryQuery = useCategoryById(mode === "edit" ? categoryId : undefined, {
    initialData,
  });
  const createMutation = useCategoryCreate();
  const updateMutation = useCategoryUpdate();

  useSetCmsBreadcrumbLabel(mode === "edit" ? categoryQuery.data?.name : null);

  if (mode === "edit" && !categoryId) {
    return (
      <CmsErrorState
        title={categoryFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && categoryQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && categoryQuery.isError) {
    const mapped = mapCrudDomainError(categoryQuery.error, "categories");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  return (
    <CategoryFormContent
      key={mode === "edit" ? (categoryQuery.data?.id ?? categoryId) : "create"}
      mode={mode}
      categoryId={categoryId}
      category={categoryQuery.data}
      isMutating={createMutation.isPending || updateMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "categories.create");
        success(categoryFormText.created);
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, "categories.update", { id });
        success(categoryFormText.updated);
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "categories");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

function CategoryFormContent({
  mode,
  categoryId,
  category,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onMutationError,
  onValidationError,
}: CategoryFormContentProps) {
  const text = i18n.cms;
  const formText = text.forms;
  const categoryFormText = formText.resources.categories;
  const fieldText = formText.fields;
  const categoryFieldLabels = {
    name: fieldText.name,
    slug: fieldText.slug,
    description: fieldText.description,
  };

  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState<unknown>(category?.description ?? emptyContentDoc);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);

  const initialAutoSlug = useMemo(() => normalizeSlug(category?.name ?? ""), [category?.name]);
  const [manualSlug, setManualSlug] = useState(category?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(category?.slug) && category?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const autoSlug = normalizeSlug(name);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || categoryFormText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? categoryFormText.slugManualHint
    : formText.generatedFromNameHint;
  const associatedArticles = (category?.articles ?? []).map((article) => ({
    id: article.id,
    title: article.title,
    isFeatured: article.isFeatured,
  }));

  const openSlugEditor = () => {
    setManualSlug(resolvedSlug);
    setIsSlugEditing(true);
  };

  const regenerateSlugFromName = () => {
    setManualSlug(autoSlug);
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };

  const handleSubmit = async () => {
    const slugPayload = hasManualSlugOverride ? manualSlug : resolvedSlug || undefined;

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createCategoryInputSchema,
          {
            name,
            slug: slugPayload,
            description,
            isActive,
          },
          categoryFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateCategoryInputSchema,
        {
          name,
          slug: slugPayload,
          description,
          isActive,
        },
        categoryFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: categoryId!,
        data: validation.value,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsPageHeader
        title={mode === "create" ? categoryFormText.createTitle : categoryFormText.editTitle}
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

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-6 overflow-hidden",
          mode === "edit" && "lg:grid-cols-[minmax(0,1fr)_360px]",
        )}
      >
        <div className="min-h-0 space-y-4 overflow-y-auto pb-6 pr-1">
          <section className="space-y-4 border border-foreground p-4">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {categoryFormText.identitySection}
            </div>

            <CmsFormField label={fieldText.name} htmlFor="category-name" required>
              <CmsTextInput
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </CmsFormField>

            <CmsFormField label={fieldText.slug} htmlFor="category-slug" hint={slugHint}>
              <div className="flex items-center gap-2">
                {isSlugEditing ? (
                  <CmsTextInput
                    id="category-slug"
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
                  onClick={regenerateSlugFromName}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center border border-foreground bg-white px-3",
                    "font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover",
                  )}
                >
                  {formText.regenerateSlug}
                </button>
              </div>
            </CmsFormField>

            <CmsFormField label={fieldText.description} htmlFor="category-description">
              <CmsRichTextEditor
                value={description}
                onChange={setDescription}
                ariaLabel="Editor descrizione categoria"
              />
            </CmsFormField>
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {categoryFormText.statusSection}
            </div>

            <CmsCheckbox
              label={categoryFormText.activeLabel}
              checked={isActive}
              onChange={setIsActive}
            />
          </section>
        </div>

        {mode === "edit" ? (
          <div className="min-h-0 overflow-y-auto pb-6 pl-1">
            <CmsArticleListPanel
              title={text.navigation.articles}
              emptyText={categoryFormText.articlesPanelEmpty}
              featuredAriaLabel={i18n.cms.lists.issues.articlesPanelFeaturedAria}
              articles={associatedArticles}
              className="min-h-full"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
