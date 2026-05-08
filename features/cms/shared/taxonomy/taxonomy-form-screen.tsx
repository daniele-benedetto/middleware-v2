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
import { invalidateAfterCmsMutation, type CmsMutationName } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { normalizeSlug } from "@/lib/server/validation/slug";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

import type { ZodType } from "zod";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type CmsTaxonomyArticleSummary = {
  id: string;
  title: string;
  isFeatured: boolean;
};

type CmsTaxonomyDetail = {
  id: string;
  name: string;
  slug: string;
  description: unknown;
  isActive: boolean;
  articles?: CmsTaxonomyArticleSummary[];
};

type CmsTaxonomyQueryState<TDetail> = {
  data?: TDetail;
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

type CmsTaxonomyMutationState<TInput> = {
  isPending: boolean;
  mutateAsync: (input: TInput) => Promise<unknown>;
};

type CmsTaxonomyResource = "categories" | "tags";
type CmsTaxonomyFormText = {
  invalidTitle: string;
  createTitle: string;
  editTitle: string;
  created: string;
  updated: string;
  activeLabel: string;
  descriptionEditorAriaLabel: string;
  statusSection: string;
  slugPreviewPlaceholder: string;
  slugManualHint: string;
  articlesPanelEmpty: string;
};

type CmsTaxonomyFormScreenProps<TCreateInput, TUpdateInput, TDetail extends CmsTaxonomyDetail> = {
  mode: "create" | "edit";
  entityId?: string;
  detailQuery: CmsTaxonomyQueryState<TDetail>;
  createMutation: CmsTaxonomyMutationState<TCreateInput>;
  updateMutation: CmsTaxonomyMutationState<{ id: string; data: TUpdateInput }>;
  createSchema: ZodType<TCreateInput>;
  updateSchema: ZodType<TUpdateInput>;
  resource: CmsTaxonomyResource;
  resourceText: CmsTaxonomyFormText;
  listPath: string;
  createMutationName: Extract<CmsMutationName, "categories.create" | "tags.create">;
  updateMutationName: Extract<CmsMutationName, "categories.update" | "tags.update">;
};

type CmsTaxonomyFormContentProps<TCreateInput, TUpdateInput, TDetail extends CmsTaxonomyDetail> = {
  mode: "create" | "edit";
  entityId?: string;
  detail?: TDetail;
  isMutating: boolean;
  resourceText: CmsTaxonomyFormText;
  onCancel: () => void;
  onCreate: (payload: TCreateInput) => Promise<void>;
  onUpdate: (payload: { id: string; data: TUpdateInput }) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
  createSchema: ZodType<TCreateInput>;
  updateSchema: ZodType<TUpdateInput>;
};

export function CmsTaxonomyFormScreen<
  TCreateInput,
  TUpdateInput,
  TDetail extends CmsTaxonomyDetail,
>({
  mode,
  entityId,
  detailQuery,
  createMutation,
  updateMutation,
  createSchema,
  updateSchema,
  resource,
  resourceText,
  listPath,
  createMutationName,
  updateMutationName,
}: CmsTaxonomyFormScreenProps<TCreateInput, TUpdateInput, TDetail>) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation(listPath);
  const text = i18n.cms;
  const formText = text.forms;

  useSetCmsBreadcrumbLabel(mode === "edit" ? detailQuery.data?.name : null);

  if (mode === "edit" && !entityId) {
    return (
      <CmsErrorState
        title={resourceText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && detailQuery.isPending) {
    return <CmsLoadingState />;
  }

  if (mode === "edit" && detailQuery.isError) {
    const mapped = mapCrudDomainError(detailQuery.error, resource);
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  return (
    <CmsTaxonomyFormContent
      key={mode === "edit" ? (detailQuery.data?.id ?? entityId) : "create"}
      mode={mode}
      entityId={entityId}
      detail={detailQuery.data}
      isMutating={createMutation.isPending || updateMutation.isPending}
      resourceText={resourceText}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, createMutationName);
        success(resourceText.created);
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, updateMutationName, { id });
        success(resourceText.updated);
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, resource);
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
      createSchema={createSchema}
      updateSchema={updateSchema}
    />
  );
}

function CmsTaxonomyFormContent<TCreateInput, TUpdateInput, TDetail extends CmsTaxonomyDetail>({
  mode,
  entityId,
  detail,
  isMutating,
  resourceText,
  onCancel,
  onCreate,
  onUpdate,
  onMutationError,
  onValidationError,
  createSchema,
  updateSchema,
}: CmsTaxonomyFormContentProps<TCreateInput, TUpdateInput, TDetail>) {
  const text = i18n.cms;
  const formText = text.forms;
  const fieldText = formText.fields;
  const fieldLabels = {
    name: fieldText.name,
    slug: fieldText.slug,
    description: fieldText.description,
  };

  const [name, setName] = useState(detail?.name ?? "");
  const [description, setDescription] = useState<unknown>(detail?.description ?? emptyContentDoc);
  const [isActive, setIsActive] = useState(detail?.isActive ?? true);

  const initialAutoSlug = useMemo(() => normalizeSlug(detail?.name ?? ""), [detail?.name]);
  const [manualSlug, setManualSlug] = useState(detail?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(detail?.slug) && detail?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);

  const autoSlug = normalizeSlug(name);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || resourceText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? resourceText.slugManualHint
    : formText.generatedFromNameHint;
  const associatedArticles = (detail?.articles ?? []).map((article) => ({
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
          createSchema,
          {
            name,
            slug: slugPayload,
            description,
            isActive,
          },
          fieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateSchema,
        {
          name,
          slug: slugPayload,
          description,
          isActive,
        },
        fieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: entityId!,
        data: validation.value,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <CmsPageHeader
        title={mode === "create" ? resourceText.createTitle : resourceText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isMutating}>
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField label={fieldText.name} htmlFor="taxonomy-name" required>
            <CmsTextInput
              id="taxonomy-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.slug} htmlFor="taxonomy-slug" hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <CmsTextInput
                  id="taxonomy-slug"
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

          <CmsFormField
            label={fieldText.description}
            htmlFor="taxonomy-description"
            className="flex flex-1 flex-col"
          >
            <CmsRichTextEditor
              value={description}
              onChange={setDescription}
              ariaLabel={resourceText.descriptionEditorAriaLabel}
              fullHeight
            />
          </CmsFormField>
        </div>

        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {resourceText.statusSection}
            </div>

            <CmsCheckbox
              label={resourceText.activeLabel}
              checked={isActive}
              onChange={setIsActive}
            />
          </section>

          {mode === "edit" ? (
            <section className="flex min-h-0 flex-1 flex-col">
              <CmsArticleListPanel
                title={text.navigation.articles}
                emptyText={resourceText.articlesPanelEmpty}
                featuredAriaLabel={i18n.cms.lists.issues.articlesPanelFeaturedAria}
                articles={associatedArticles}
                className="min-h-0 flex-1"
              />
            </section>
          ) : null}
        </div>
      </div>
    </form>
  );
}
