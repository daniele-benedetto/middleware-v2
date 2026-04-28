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
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

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
  const formText = text.forms;
  const tagFormText = formText.resources.tags;
  const tagQuery = useTagById(mode === "edit" ? tagId : undefined, { initialData });
  const createMutation = useTagCreate();
  const updateMutation = useTagUpdate();

  useSetCmsBreadcrumbLabel(mode === "edit" ? tagQuery.data?.name : null);

  if (mode === "edit" && !tagId) {
    return (
      <CmsErrorState
        title={tagFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
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
        success(tagFormText.created);
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, "tags.update", { id });
        success(tagFormText.updated);
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
  const formText = text.forms;
  const tagFormText = formText.resources.tags;
  const fieldText = formText.fields;
  const tagFieldLabels = {
    name: fieldText.name,
    slug: fieldText.slug,
    description: fieldText.description,
  };
  const [name, setName] = useState(tag?.name ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [description, setDescription] = useState(tag?.description ?? "");
  const [isActive, setIsActive] = useState(tag?.isActive ?? true);

  const regenerateSlugFromName = () => {
    setSlug(normalizeSlug(name));
  };

  const handleSubmit = async () => {
    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createTagInputSchema,
          {
            name,
            slug: slug || undefined,
            description: description || undefined,
            isActive,
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
          isActive,
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
      <CmsPageHeader title={mode === "create" ? tagFormText.createTitle : tagFormText.editTitle} />

      <div className="space-y-4 border border-foreground p-4">
        <CmsFormField label={fieldText.name} htmlFor="tag-name" required>
          <CmsTextInput
            id="tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </CmsFormField>

        <CmsFormField
          label={fieldText.slug}
          htmlFor="tag-slug"
          required={mode === "edit"}
          hint={mode === "create" ? formText.generatedFromNameHint : undefined}
        >
          <div className="flex items-center gap-2">
            <CmsTextInput
              id="tag-slug"
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

        <CmsFormField label={fieldText.description} htmlFor="tag-description">
          <CmsTextarea
            id="tag-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </CmsFormField>

        <CmsCheckbox label={tagFormText.activeLabel} checked={isActive} onChange={setIsActive} />

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
