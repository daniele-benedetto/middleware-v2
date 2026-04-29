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

import type { RouterInputs } from "@/lib/trpc/types";

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
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);

  const regenerateSlugFromName = () => {
    setSlug(normalizeSlug(name));
  };

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createCategoryInputSchema,
          {
            name,
            slug: slug || undefined,
            description: description || undefined,
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
          slug,
          description: description ? description : null,
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
    <div className="space-y-6">
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

      <div className="space-y-4 border border-foreground p-4">
        <CmsFormField label={fieldText.name} htmlFor="category-name" required>
          <CmsTextInput
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField
          label={fieldText.slug}
          htmlFor="category-slug"
          required={mode === "edit"}
          hint={mode === "create" ? formText.generatedFromNameHint : undefined}
        >
          <div className="flex items-center gap-2">
            <CmsTextInput
              id="category-slug"
              className="flex-1"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
            />
            <button
              type="button"
              onClick={regenerateSlugFromName}
              className="shrink-0 font-ui text-[10px] uppercase tracking-[0.06em] text-muted-foreground hover:text-accent"
            >
              {formText.regenerateSlug}
            </button>
          </div>
        </CmsFormField>

        <CmsFormField label={fieldText.description} htmlFor="category-description">
          <CmsTextarea
            id="category-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </CmsFormField>

        <CmsCheckbox
          label={categoryFormText.activeLabel}
          checked={isActive}
          onChange={setIsActive}
        />
      </div>
    </div>
  );
}
