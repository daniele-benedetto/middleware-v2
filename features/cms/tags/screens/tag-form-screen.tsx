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
import { cn } from "@/lib/utils";

import type { RouterInputs } from "@/lib/trpc/types";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

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
  const [description, setDescription] = useState<unknown>(tag?.description ?? emptyContentDoc);
  const [isActive, setIsActive] = useState(tag?.isActive ?? true);

  const initialAutoSlug = useMemo(() => normalizeSlug(tag?.name ?? ""), [tag?.name]);
  const [manualSlug, setManualSlug] = useState(tag?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(tag?.slug) && tag?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const autoSlug = normalizeSlug(name);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || tagFormText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? tagFormText.slugManualHint
    : formText.generatedFromNameHint;
  const associatedArticles = (tag?.articles ?? []).map((article) => ({
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
          createTagInputSchema,
          {
            name,
            slug: slugPayload,
            description,
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
          slug: slugPayload,
          description,
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CmsPageHeader
        title={mode === "create" ? tagFormText.createTitle : tagFormText.editTitle}
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
              {tagFormText.identitySection}
            </div>

            <CmsFormField label={fieldText.name} htmlFor="tag-name" required>
              <CmsTextInput
                id="tag-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </CmsFormField>

            <CmsFormField label={fieldText.slug} htmlFor="tag-slug" hint={slugHint}>
              <div className="flex items-center gap-2">
                {isSlugEditing ? (
                  <CmsTextInput
                    id="tag-slug"
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

            <CmsFormField label={fieldText.description} htmlFor="tag-description">
              <CmsRichTextEditor
                value={description}
                onChange={setDescription}
                ariaLabel="Editor descrizione tag"
              />
            </CmsFormField>
          </section>

          <section className="space-y-4 border border-foreground p-4">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {tagFormText.statusSection}
            </div>

            <CmsCheckbox
              label={tagFormText.activeLabel}
              checked={isActive}
              onChange={setIsActive}
            />
          </section>
        </div>

        {mode === "edit" ? (
          <div className="min-h-0 overflow-y-auto pb-6 pl-1">
            <CmsArticleListPanel
              title={text.navigation.articles}
              emptyText={tagFormText.articlesPanelEmpty}
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
