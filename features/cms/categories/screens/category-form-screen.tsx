"use client";

import { useState } from "react";

import { CmsErrorState, CmsLoadingState } from "@/components/cms/common";
import {
  CmsActionButton,
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
import { trpc } from "@/lib/trpc/react";

const categoryFieldLabels = {
  name: "Nome",
  slug: "Slug",
  description: "Descrizione",
};

type CategoryFormScreenProps = {
  mode: "create" | "edit";
  categoryId?: string;
  initialData?: CategoryDetail;
};

export function CmsCategoryFormScreen({ mode, categoryId, initialData }: CategoryFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/categories");
  const text = i18n.cms;
  const categoryQuery = useCategoryById(mode === "edit" ? categoryId : undefined, {
    initialData,
  });
  const createMutation = useCategoryCreate();
  const updateMutation = useCategoryUpdate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  if (mode === "edit" && !categoryId) {
    return (
      <CmsErrorState title="Categoria non valida" description="ID mancante per la modifica." />
    );
  }

  if (mode === "edit" && categoryQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && categoryQuery.isError) {
    const mapped = mapCrudDomainError(categoryQuery.error, "categories");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    const payload = {
      name: name || categoryQuery.data?.name || "",
      slug: slug || categoryQuery.data?.slug || "",
      description: description || categoryQuery.data?.description || "" || undefined,
    };

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createCategoryInputSchema,
          payload,
          categoryFieldLabels,
        );

        if (!validation.ok) {
          cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
          return;
        }

        await createMutation.mutateAsync(validation.value);
        await invalidateAfterCmsMutation(trpcUtils, "categories.create");
        success("Categoria creata.");
        return;
      }

      const validation = validateFormInput(updateCategoryInputSchema, payload, categoryFieldLabels);

      if (!validation.ok) {
        cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
        return;
      }

      await updateMutation.mutateAsync({
        id: categoryId!,
        data: validation.value,
      });
      await invalidateAfterCmsMutation(trpcUtils, "categories.update", { id: categoryId });
      success("Categoria aggiornata.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "categories");
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader title={mode === "create" ? "Nuova Categoria" : "Modifica Categoria"} />

      <div className="space-y-4 border border-foreground p-4">
        <CmsFormField label="Nome" htmlFor="category-name" required>
          <CmsTextInput
            id="category-name"
            value={name || categoryQuery.data?.name || ""}
            onChange={(event) => setName(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Slug" htmlFor="category-slug" required>
          <CmsTextInput
            id="category-slug"
            value={slug || categoryQuery.data?.slug || ""}
            onChange={(event) => setSlug(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Descrizione" htmlFor="category-description">
          <CmsTextarea
            id="category-description"
            value={description || categoryQuery.data?.description || ""}
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
    </div>
  );
}
