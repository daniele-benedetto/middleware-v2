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
} from "@/features/cms/categories/hooks/use-category-crud";
import { mapCrudDomainError, useCmsFormNavigation } from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type CategoryFormScreenProps = {
  mode: "create" | "edit";
  categoryId?: string;
};

export function CmsCategoryFormScreen({ mode, categoryId }: CategoryFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/categories");
  const text = i18n.cms;
  const categoryQuery = useCategoryById(mode === "edit" ? categoryId : undefined);
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
    const resolvedName = name || categoryQuery.data?.name || "";
    const resolvedSlug = slug || categoryQuery.data?.slug || "";
    const resolvedDescription = description || categoryQuery.data?.description || "";

    if (!resolvedName.trim() || !resolvedSlug.trim()) {
      cmsToast.error("Nome e slug sono obbligatori.", text.trpcErrors.badRequestTitle);
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          name: resolvedName,
          slug: resolvedSlug,
          description: resolvedDescription || undefined,
        });
        await invalidateAfterCmsMutation(trpcUtils, "categories.create");
        success("Categoria creata.");
        return;
      }

      await updateMutation.mutateAsync({
        id: categoryId!,
        data: {
          name: resolvedName,
          slug: resolvedSlug,
          description: resolvedDescription || undefined,
        },
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
            {mode === "create" ? "Crea" : "Salva"}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
