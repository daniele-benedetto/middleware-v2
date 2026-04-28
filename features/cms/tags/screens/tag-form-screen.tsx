"use client";

import { useState } from "react";

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
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import {
  useTagById,
  useTagCreate,
  useTagUpdate,
  type TagDetail,
} from "@/features/cms/tags/hooks/use-tag-crud";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { createTagInputSchema, updateTagInputSchema } from "@/lib/server/modules/tags/schema";
import { trpc } from "@/lib/trpc/react";

const tagFieldLabels = {
  name: "Nome",
  slug: "Slug",
  description: "Descrizione",
};

type TagFormScreenProps = {
  mode: "create" | "edit";
  tagId?: string;
  initialData?: TagDetail;
};

export function CmsTagFormScreen({ mode, tagId, initialData }: TagFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/tags");
  const text = i18n.cms;
  const tagQuery = useTagById(mode === "edit" ? tagId : undefined, { initialData });
  const createMutation = useTagCreate();
  const updateMutation = useTagUpdate();

  useSetCmsBreadcrumbLabel(mode === "edit" ? tagQuery.data?.name : null);

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
    const payload = {
      name: name || tagQuery.data?.name || "",
      slug: slug || tagQuery.data?.slug || "",
      description: description || tagQuery.data?.description || "" || undefined,
    };

    try {
      if (mode === "create") {
        const validation = validateFormInput(createTagInputSchema, payload, tagFieldLabels);

        if (!validation.ok) {
          cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
          return;
        }

        await createMutation.mutateAsync(validation.value);
        await invalidateAfterCmsMutation(trpcUtils, "tags.create");
        success("Tag creato.");
        return;
      }

      const validation = validateFormInput(updateTagInputSchema, payload, tagFieldLabels);

      if (!validation.ok) {
        cmsToast.error(validation.message, text.trpcErrors.badRequestTitle);
        return;
      }

      await updateMutation.mutateAsync({
        id: tagId!,
        data: validation.value,
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
      <CmsPageHeader title={mode === "create" ? "Nuovo Tag" : "Modifica Tag"} />

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
            {mode === "create" ? text.forms.create : text.forms.save}
          </CmsActionButton>
        </div>
      </div>
    </div>
  );
}
