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
import { mapCrudDomainError, useCmsFormNavigation } from "@/features/cms/shared/forms";
import { useTagById, useTagCreate, useTagUpdate } from "@/features/cms/tags/hooks/use-tag-crud";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";

type TagFormScreenProps = {
  mode: "create" | "edit";
  tagId?: string;
};

export function CmsTagFormScreen({ mode, tagId }: TagFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/tags");
  const text = i18n.cms;
  const tagQuery = useTagById(mode === "edit" ? tagId : undefined);
  const createMutation = useTagCreate();
  const updateMutation = useTagUpdate();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  if (mode === "edit" && !tagId) {
    return <CmsErrorState title="Tag non valido" description="ID mancante per la modifica." />;
  }

  if (mode === "edit" && tagQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && tagQuery.isError) {
    const mapped = mapCrudDomainError(tagQuery.error, "tags");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    const resolvedName = name || tagQuery.data?.name || "";
    const resolvedSlug = slug || tagQuery.data?.slug || "";
    const resolvedDescription = description || tagQuery.data?.description || "";

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
        await invalidateAfterCmsMutation(trpcUtils, "tags.create");
        success("Tag creato.");
        return;
      }

      await updateMutation.mutateAsync({
        id: tagId!,
        data: {
          name: resolvedName,
          slug: resolvedSlug,
          description: resolvedDescription || undefined,
        },
      });
      await invalidateAfterCmsMutation(trpcUtils, "tags.update", { id: tagId });
      success("Tag aggiornato.");
    } catch (error) {
      const mapped = mapCrudDomainError(error, "tags");
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={mode === "create" ? "Nuovo Tag" : "Modifica Tag"}
        subtitle="Preparazione CRUD route-based: form pronta per route dedicate."
      />

      <div className="space-y-4 border border-foreground p-4">
        <CmsFormField label="Nome" htmlFor="tag-name" required>
          <CmsTextInput
            id="tag-name"
            value={name || tagQuery.data?.name || ""}
            onChange={(event) => setName(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Slug" htmlFor="tag-slug" required>
          <CmsTextInput
            id="tag-slug"
            value={slug || tagQuery.data?.slug || ""}
            onChange={(event) => setSlug(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Descrizione" htmlFor="tag-description">
          <CmsTextarea
            id="tag-description"
            value={description || tagQuery.data?.description || ""}
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
