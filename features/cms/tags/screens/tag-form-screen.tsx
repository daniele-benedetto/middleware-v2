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

import type { RouterInputs } from "@/lib/trpc/types";

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

type TagCreateInput = RouterInputs["tags"]["create"];
type TagUpdateInput = RouterInputs["tags"]["update"]["data"];

type TagFormContentProps = {
  mode: "create" | "edit";
  tagId?: string;
  tag?: TagDetail;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: TagCreateInput) => Promise<void>;
  onUpdate: (payload: { id: string; data: TagUpdateInput }) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

export function CmsTagFormScreen({ mode, tagId, initialData }: TagFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/tags");
  const text = i18n.cms;
  const tagQuery = useTagById(mode === "edit" ? tagId : undefined, { initialData });
  const createMutation = useTagCreate();
  const updateMutation = useTagUpdate();

  useSetCmsBreadcrumbLabel(mode === "edit" ? tagQuery.data?.name : null);

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

  return (
    <TagFormContent
      key={mode === "edit" ? (tagQuery.data?.id ?? tagId) : "create"}
      mode={mode}
      tagId={tagId}
      tag={tagQuery.data}
      isMutating={createMutation.isPending || updateMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "tags.create");
        success("Tag creato.");
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, "tags.update", { id });
        success("Tag aggiornato.");
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "tags");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

function TagFormContent({
  mode,
  tagId,
  tag,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onMutationError,
  onValidationError,
}: TagFormContentProps) {
  const text = i18n.cms;
  const [name, setName] = useState(tag?.name ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [description, setDescription] = useState(tag?.description ?? "");

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createTagInputSchema,
          {
            name,
            slug,
            description: description || undefined,
          },
          tagFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateTagInputSchema,
        {
          name,
          slug,
          description: description ? description : null,
        },
        tagFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: tagId!,
        data: validation.value,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader title={mode === "create" ? "Nuovo Tag" : "Modifica Tag"} />

      <div className="space-y-4 border border-foreground p-4">
        <CmsFormField label="Nome" htmlFor="tag-name" required>
          <CmsTextInput
            id="tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Slug" htmlFor="tag-slug" required>
          <CmsTextInput
            id="tag-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField label="Descrizione" htmlFor="tag-description">
          <CmsTextarea
            id="tag-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
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
