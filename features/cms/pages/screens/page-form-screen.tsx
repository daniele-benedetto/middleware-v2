"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CmsConfirmDialog, CmsErrorState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsFormField,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsSelect,
  CmsStyledTitleEditor,
  CmsTextInput,
  cmsToast,
  createStyledTitleValue,
  getStyledTitlePlainText,
  hasStyledTitleFormatting,
} from "@/components/cms/primitives";
import { CmsPageFormLoading } from "@/features/cms/pages/components/page-form-loading";
import {
  usePageById,
  usePageCreate,
  usePageUpdate,
  type PageDetail,
} from "@/features/cms/pages/hooks/use-page-crud";
import { mapCrudDomainError, useCmsFormNavigation } from "@/features/cms/shared/forms";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { normalizeSlug } from "@/lib/validation/slug";

import type { PageTitleStyled } from "@/lib/server/modules/pages/schema";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };
const pageStatusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

const pageFormStateSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim(),
  excerptRich: z.unknown(),
  contentRich: z.unknown(),
  status: z.enum(pageStatusOptions),
});

type PageFormValues = z.infer<typeof pageFormStateSchema>;
type PageEditorialStatus = (typeof pageStatusOptions)[number];

type PageFormScreenProps = {
  mode: "create" | "edit";
  pageId?: string;
  initialData?: PageDetail;
};

function resolvePublishedAtForStatus(status: PageEditorialStatus, currentValue: string | null) {
  if (status !== "PUBLISHED") {
    return null;
  }

  if (!currentValue) {
    return new Date();
  }

  const parsed = new Date(currentValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getPageFormDefaultValues(page?: PageDetail): PageFormValues {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    excerptRich: page?.excerptRich ?? emptyContentDoc,
    contentRich: page?.contentRich ?? emptyContentDoc,
    status: page?.status ?? "DRAFT",
  };
}

export function CmsPageFormScreen({ mode, pageId, initialData }: PageFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/pages");
  const text = i18n.cms;
  const formText = text.forms;
  const pageFormText = formText.resources.pages;
  const pageQuery = usePageById(mode === "edit" ? pageId : undefined, { initialData });
  const createMutation = usePageCreate();
  const updateMutation = usePageUpdate();
  const deleteMutation = trpc.pages.delete.useMutation();
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(mode === "edit");
  const [isSlugEditing, setIsSlugEditing] = useState(false);
  const page = pageQuery.data;
  const [titleStyled, setTitleStyled] = useState<PageTitleStyled>(() =>
    createStyledTitleValue(page?.title ?? "", page?.titleStyled),
  );
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormStateSchema),
    defaultValues: getPageFormDefaultValues(page),
  });
  const { control, handleSubmit, setValue } = form;
  const watchedTitle = getStyledTitlePlainText(titleStyled);
  const watchedSlug = useWatch({ control, name: "slug" });
  const resolvedSlug = normalizeSlug(watchedSlug || watchedTitle || "");
  const slugPreview = resolvedSlug || pageFormText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? pageFormText.slugManualHint
    : formText.generatedFromTitleHint;

  if (mode === "edit" && !pageId) {
    return (
      <CmsErrorState
        title={pageFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && pageQuery.isPending) {
    return <CmsPageFormLoading />;
  }

  if (mode === "edit" && pageQuery.isError) {
    const mapped = mapCrudDomainError(pageQuery.error, "pages");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  const statusOptions = [
    { value: "DRAFT", label: text.lists.pages.statusDraft },
    { value: "PUBLISHED", label: text.lists.pages.statusPublished },
    { value: "ARCHIVED", label: text.lists.pages.statusArchived },
  ];

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleTitleChange = (nextTitleStyled: PageTitleStyled) => {
    setTitleStyled(nextTitleStyled);
    setValue("title", getStyledTitlePlainText(nextTitleStyled), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleDelete = async () => {
    if (!pageId) return;

    try {
      await deleteMutation.mutateAsync({ id: pageId });
      await invalidateAfterCmsMutation(trpcUtils, "pages.delete", { id: pageId });
      success();
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const titleStyledPayload = hasStyledTitleFormatting(titleStyled) ? titleStyled : null;
    const slug = normalizeSlug(values.slug || values.title);

    if (!slug) {
      form.setError("slug", { message: formText.fields.slug });
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          title: values.title,
          titleStyled: titleStyledPayload,
          slug,
          excerptRich: values.excerptRich,
          contentRich: values.contentRich,
          status: "DRAFT",
          publishedAt: null,
        });
        await invalidateAfterCmsMutation(trpcUtils, "pages.create");
        cmsToast.success(pageFormText.created);
      } else if (pageId) {
        await updateMutation.mutateAsync({
          id: pageId,
          data: {
            title: values.title,
            titleStyled: titleStyledPayload,
            slug,
            excerptRich: values.excerptRich,
            contentRich: values.contentRich,
            status: values.status,
            publishedAt: resolvePublishedAtForStatus(values.status, page?.publishedAt ?? null),
          },
        });
        await invalidateAfterCmsMutation(trpcUtils, "pages.update");
        cmsToast.success(pageFormText.updated);
      }

      success();
    } catch (error) {
      const mapped = mapTrpcErrorToCmsUiMessage(error);
      cmsToast.error(mapped.description, mapped.title);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-6">
      <CmsPageHeader
        title={mode === "create" ? pageFormText.createTitle : pageFormText.editTitle}
        actions={
          <div className="flex gap-2">
            {mode === "edit" ? (
              <CmsConfirmDialog
                triggerLabel={text.quickActions.delete}
                triggerIcon={<Trash2 aria-hidden />}
                triggerDisabled={isSubmitting}
                title={text.quickActions.confirmDeleteTitle}
                description={text.quickActions.confirmDeleteSinglePage}
                tone="danger"
                onConfirm={handleDelete}
              />
            ) : null}
            <CmsActionButton variant="outline" onClick={cancel}>
              <X aria-hidden />
              {text.resource.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isSubmitting}>
              {mode === "create" ? <Plus aria-hidden /> : <Save aria-hidden />}
              {mode === "create" ? formText.create : formText.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField
            label={formText.fields.title}
            htmlFor="page-title"
            hint={pageFormText.titleStyledHint}
            required
          >
            <CmsStyledTitleEditor
              id="page-title"
              value={titleStyled}
              onChange={handleTitleChange}
              placeholder={formText.fields.title}
              accentLabel={pageFormText.titleStyledAccentAction}
              lineBreakLabel={pageFormText.titleStyledLineBreakAction}
              ariaLabel={pageFormText.titleStyledEditorAriaLabel}
            />
            <input type="hidden" {...form.register("title")} />
          </CmsFormField>

          <CmsFormField label={formText.fields.slug} htmlFor="page-slug" required hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <Controller
                  name="slug"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsTextInput
                      id="page-slug"
                      className="flex-1"
                      value={field.value}
                      autoFocus
                      state={fieldState.error ? "error" : undefined}
                      onBlur={() => {
                        field.onBlur();
                        setIsSlugEditing(false);
                      }}
                      onChange={(event) => {
                        field.onChange(event.target.value);
                        setHasManualSlugOverride(true);
                      }}
                    />
                  )}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSlugEditing(true)}
                  className={cn(
                    "flex h-10 flex-1 items-center rounded-[6px] border border-foreground bg-card px-3 text-left",
                    "font-ui text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-surface-hover",
                    resolvedSlug ? "text-foreground" : "text-border",
                  )}
                >
                  {slugPreview}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setValue("slug", normalizeSlug(watchedTitle ?? ""), { shouldDirty: true });
                  setHasManualSlugOverride(false);
                }}
                className="inline-flex h-10 shrink-0 items-center rounded-[6px] border border-foreground bg-card px-3 font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover"
              >
                {formText.regenerateSlug}
              </button>
            </div>
          </CmsFormField>

          <CmsFormField label={formText.fields.excerpt} htmlFor="page-excerpt-rich">
            <Controller
              name="excerptRich"
              control={control}
              render={({ field }) => (
                <CmsRichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel={pageFormText.excerptEditorAriaLabel}
                />
              )}
            />
          </CmsFormField>

          <CmsFormField
            label={pageFormText.contentFieldLabel}
            htmlFor="page-content-rich"
            required
            className="flex flex-1 flex-col"
          >
            <Controller
              name="contentRich"
              control={control}
              render={({ field }) => (
                <CmsRichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel={pageFormText.contentEditorAriaLabel}
                  fullHeight
                />
              )}
            />
          </CmsFormField>
        </div>

        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {pageFormText.publishingSection}
            </div>

            {mode === "edit" ? (
              <CmsFormField label={text.lists.pages.table.status} htmlFor="page-status" required>
                <Controller
                  name="status"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsSelect
                      value={field.value}
                      state={fieldState.error ? "error" : undefined}
                      onValueChange={(value) => field.onChange(value as PageEditorialStatus)}
                      options={statusOptions}
                    />
                  )}
                />
              </CmsFormField>
            ) : (
              <div className="rounded-[6px] border border-dashed border-border px-3 py-2 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {pageFormText.createStatusHint}
              </div>
            )}
          </section>
        </div>
      </div>
    </form>
  );
}
