"use client";

import {
  useCategoryById,
  useCategoryCreate,
  useCategoryUpdate,
  type CategoryDetail,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/features/cms/categories/hooks/use-category-crud";
import { CmsTaxonomyFormScreen } from "@/features/cms/shared/taxonomy/taxonomy-form-screen";
import { i18n } from "@/lib/i18n";
import {
  createCategoryInputSchema,
  updateCategoryInputSchema,
} from "@/lib/server/modules/categories/schema";

type CategoryFormScreenProps = {
  mode: "create" | "edit";
  categoryId?: string;
  initialData?: CategoryDetail;
};

export function CmsCategoryFormScreen({ mode, categoryId, initialData }: CategoryFormScreenProps) {
  const detailQuery = useCategoryById(mode === "edit" ? categoryId : undefined, {
    initialData,
  });
  const createMutation = useCategoryCreate();
  const updateMutation = useCategoryUpdate();

  return (
    <CmsTaxonomyFormScreen<CreateCategoryInput, UpdateCategoryInput, CategoryDetail>
      mode={mode}
      entityId={categoryId}
      detailQuery={detailQuery}
      createMutation={createMutation}
      updateMutation={updateMutation}
      createSchema={createCategoryInputSchema}
      updateSchema={updateCategoryInputSchema}
      resource="categories"
      resourceText={i18n.cms.forms.resources.categories}
      listPath="/cms/categories"
      createMutationName="categories.create"
      updateMutationName="categories.update"
    />
  );
}
