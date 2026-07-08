"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CmsConfirmDialog, CmsErrorState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsBody,
  CmsFormField,
  CmsMetaText,
  CmsPageHeader,
  CmsRichTextEditor,
  CmsSearchSelect,
  CmsSelect,
  CmsStyledTitleEditor,
  CmsTextInput,
  cmsToast,
  createStyledTitleValue,
  getStyledTitlePlainText,
  hasStyledTitleFormatting,
} from "@/components/cms/primitives";
import { ArticleMediaFieldPreview } from "@/features/cms/articles/components/article-media-field-preview";
import { CmsLessonFormLoading } from "@/features/cms/lessons/components/lesson-form-loading";
import {
  useCourseOptions,
  useLessonById,
  useLessonCreate,
  useLessonUpdate,
  type CreateLessonInput,
  type LessonDetail,
  type UpdateLessonInput,
} from "@/features/cms/lessons/hooks/use-lesson-crud";
import { CmsMediaPickerDialog } from "@/features/cms/media/components/media-picker-dialog";
import { publishLivePreviewMessage } from "@/features/cms/preview/use-live-preview";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { createLivePreviewSessionId, toLessonLivePreviewSnapshot } from "@/lib/cms/preview/live";
import { invalidateAfterCmsMutation, mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";
import { cmsMetaLabelClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { extractCmsMediaPathname } from "@/lib/media/blob";
import {
  createLessonInputSchema,
  updateLessonInputSchema,
} from "@/lib/server/modules/lessons/schema";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { normalizeSlug } from "@/lib/validation/slug";

import type { CoursesListInitialData } from "@/features/cms/shared/types/initial-data";
import type { LessonTitleStyled } from "@/lib/server/modules/lessons/schema";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

type LessonFormScreenProps = {
  mode: "create" | "edit";
  lessonId?: string;
  courseId?: string;
  initialData?: LessonDetail;
  initialCourseOptions?: CoursesListInitialData;
};

type LessonEditorialStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

const lessonStatusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

function isValidOptionalUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return true;
  }

  if (extractCmsMediaPathname(trimmedValue)) {
    return true;
  }

  try {
    new URL(trimmedValue);
    return true;
  } catch {
    return false;
  }
}

const lessonFormStateSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(1),
  slug: z.string().trim(),
  excerptRich: z.unknown(),
  contentRich: z.unknown(),
  imageUrl: z.string().trim().refine(isValidOptionalUrl),
  imageAlt: z.string().trim().max(240),
  audioUrl: z.string().trim().refine(isValidOptionalUrl),
  audioChunksUrl: z.string().trim().refine(isValidOptionalUrl),
  status: z.enum(lessonStatusOptions),
});

type LessonFormValues = z.infer<typeof lessonFormStateSchema>;

function extractAudioChunksUrl(value: unknown) {
  return typeof value === "string" ? value : "";
}

function resolvePublishedAtForStatus(status: LessonEditorialStatus, currentValue: string | null) {
  if (status !== "PUBLISHED") {
    return null;
  }

  if (!currentValue) {
    return new Date();
  }

  const parsed = new Date(currentValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getLessonFormDefaultValues(
  lesson?: LessonDetail,
  fallbackCourseId?: string,
): LessonFormValues {
  return {
    courseId: lesson?.courseId ?? fallbackCourseId ?? "",
    title: lesson?.title ?? "",
    slug: lesson?.slug ?? "",
    excerptRich: lesson?.excerptRich ?? emptyContentDoc,
    contentRich: lesson?.contentRich ?? emptyContentDoc,
    imageUrl: lesson?.imageUrl ?? "",
    imageAlt: lesson?.imageAlt ?? "",
    audioUrl: lesson?.audioUrl ?? "",
    audioChunksUrl: extractAudioChunksUrl(lesson?.audioChunks),
    status: lesson?.status ?? "DRAFT",
  };
}

function buildCreateLessonPayload(
  values: LessonFormValues,
  resolvedSlug: string,
  titleStyled: LessonTitleStyled | null,
) {
  return {
    courseId: values.courseId,
    title: values.title,
    titleStyled,
    slug: resolvedSlug,
    excerptRich: values.excerptRich,
    contentRich: values.contentRich,
    imageUrl: values.imageUrl || undefined,
    imageAlt: values.imageAlt || undefined,
    audioUrl: values.audioUrl || undefined,
    audioChunks: values.audioChunksUrl || undefined,
  };
}

function buildUpdateLessonPayload(
  values: LessonFormValues,
  lesson: LessonDetail | undefined,
  resolvedSlug: string,
  titleStyled: LessonTitleStyled | null,
) {
  return {
    courseId: values.courseId,
    title: values.title,
    titleStyled,
    slug: resolvedSlug,
    excerptRich: values.excerptRich,
    contentRich: values.contentRich,
    imageUrl: values.imageUrl ? values.imageUrl : null,
    imageAlt: values.imageAlt ? values.imageAlt : null,
    audioUrl: values.audioUrl ? values.audioUrl : null,
    audioChunks: values.audioChunksUrl
      ? values.audioChunksUrl
      : extractAudioChunksUrl(lesson?.audioChunks)
        ? null
        : undefined,
    status: values.status,
    publishedAt: resolvePublishedAtForStatus(values.status, lesson?.publishedAt ?? null),
  };
}

export function CmsLessonFormScreen({
  mode,
  lessonId,
  courseId,
  initialData,
  initialCourseOptions,
}: LessonFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/incontri");
  const text = i18n.cms;
  const formText = text.forms;
  const lessonFormText = formText.resources.lessons;

  const lessonQuery = useLessonById(mode === "edit" ? lessonId : undefined, { initialData });
  const courseOptionsQuery = useCourseOptions({ initialData: initialCourseOptions });
  const createMutation = useLessonCreate();
  const updateMutation = useLessonUpdate();
  const deleteMutation = trpc.lessons.delete.useMutation();

  if (mode === "edit" && !lessonId) {
    return (
      <CmsErrorState
        title={lessonFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && lessonQuery.isPending) {
    return <CmsLessonFormLoading />;
  }

  if (mode === "edit" && lessonQuery.isError) {
    const mapped = mapCrudDomainError(lessonQuery.error, "lessons");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  if (courseOptionsQuery.isError) {
    const mapped = mapTrpcErrorToCmsUiMessage(courseOptionsQuery.error);

    return (
      <CmsErrorState
        title={mapped.title}
        description={mapped.description}
        onRetry={mapped.retryable ? () => void courseOptionsQuery.refetch() : undefined}
      />
    );
  }

  return (
    <LessonFormContent
      key={mode === "edit" ? (lessonQuery.data?.id ?? lessonId) : "create"}
      mode={mode}
      lessonId={lessonId}
      lesson={lessonQuery.data}
      fallbackCourseId={courseId}
      coursesAvailable={courseOptionsQuery.data?.items ?? []}
      coursesLoading={courseOptionsQuery.isPending}
      isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "lessons.create", { id: payload.courseId });
        success(lessonFormText.created);
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, "lessons.update", { id });
        success(lessonFormText.updated);
      }}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
        await invalidateAfterCmsMutation(trpcUtils, "lessons.delete", { id });
        success();
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "lessons");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

type LessonUpdatePayload = {
  id: string;
  data: UpdateLessonInput;
};

type LessonFormContentProps = {
  mode: "create" | "edit";
  lessonId?: string;
  lesson?: LessonDetail;
  fallbackCourseId?: string;
  coursesAvailable: Array<{ id: string; title: string; slug: string }>;
  coursesLoading: boolean;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateLessonInput) => Promise<void>;
  onUpdate: (payload: LessonUpdatePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

function LessonFormContent({
  mode,
  lessonId,
  lesson,
  fallbackCourseId,
  coursesAvailable,
  coursesLoading,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onDelete,
  onMutationError,
  onValidationError,
}: LessonFormContentProps) {
  const text = i18n.cms;
  const formText = text.forms;
  const lessonFormText = formText.resources.lessons;
  const fieldText = formText.fields;
  const listText = text.lists.articles;
  const formFieldLabels = {
    courseId: lessonFormText.courseFieldLabel,
    title: fieldText.title,
    titleStyled: fieldText.title,
    slug: fieldText.slug,
    excerptRich: fieldText.excerpt,
    imageUrl: fieldText.imageUrl,
    imageAlt: fieldText.imageAlt,
    audioUrl: fieldText.audioUrl,
    audioChunksUrl: fieldText.audioChunksUrl,
  };

  const payloadFieldLabels = {
    ...formFieldLabels,
    audioChunks: fieldText.audioChunksUrl,
  };

  const { control, getValues, handleSubmit, register, setValue } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormStateSchema),
    defaultValues: getLessonFormDefaultValues(lesson, fallbackCourseId),
  });

  const [titleStyled, setTitleStyled] = useState(() =>
    createStyledTitleValue(lesson?.title ?? "", lesson?.titleStyled),
  );

  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [isAudioPickerOpen, setIsAudioPickerOpen] = useState(false);
  const [isJsonPickerOpen, setIsJsonPickerOpen] = useState(false);
  const initialAutoSlug = normalizeSlug(lesson?.title ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(lesson?.slug) && lesson?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);
  const [previewSessionId] = useState(() =>
    mode === "edit" && lessonId ? lessonId : createLivePreviewSessionId(),
  );
  const [previewOpenCount, setPreviewOpenCount] = useState(0);
  const handledPreviewOpenCount = useRef(0);

  const title = getStyledTitlePlainText(titleStyled);
  const formValues = useWatch({ control });
  const manualSlug = useWatch({ control, name: "slug" }) ?? "";
  const imageUrl = useWatch({ control, name: "imageUrl" }) ?? "";
  const imageAlt = useWatch({ control, name: "imageAlt" }) ?? "";
  const audioUrl = useWatch({ control, name: "audioUrl" }) ?? "";
  const audioChunksUrl = useWatch({ control, name: "audioChunksUrl" }) ?? "";

  const courseOptions = coursesAvailable.map((course) => ({
    value: course.id,
    label: `${course.title} (${course.slug})`,
  }));

  const statusOptions = useMemo(
    () => [
      { value: "DRAFT", label: listText.statusDraft },
      { value: "PUBLISHED", label: listText.statusPublished },
      { value: "ARCHIVED", label: listText.statusArchived },
    ],
    [listText.statusArchived, listText.statusDraft, listText.statusPublished],
  );

  const autoSlug = normalizeSlug(title);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || lessonFormText.slugPreviewPlaceholder;
  const slugHint = hasManualSlugOverride
    ? lessonFormText.slugManualHint
    : formText.generatedFromTitleHint;

  const openSlugEditor = () => {
    setValue("slug", resolvedSlug, { shouldDirty: true });
    setIsSlugEditing(true);
  };

  const regenerateSlugFromTitle = () => {
    setValue("slug", autoSlug, { shouldDirty: true, shouldValidate: true });
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };

  const handleTitleChange = (nextTitleStyled: LessonTitleStyled) => {
    setTitleStyled(nextTitleStyled);
    setValue("title", getStyledTitlePlainText(nextTitleStyled), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const openPreview = () => {
    const previewPath =
      mode === "edit" && lessonId
        ? `/cms/incontri/${lessonId}/preview`
        : `/cms/incontri/new/preview?session=${encodeURIComponent(previewSessionId)}`;
    window.open(previewPath, "_blank", "noreferrer");
    setPreviewOpenCount((count) => count + 1);
  };

  useEffect(() => {
    const values = getValues();
    const selectedCourse = coursesAvailable.find((item) => item.id === values.courseId);
    const statusLabel =
      mode === "create"
        ? lessonFormText.newPreviewStatus
        : (statusOptions.find((item) => item.value === values.status)?.label ?? values.status);

    const publishSnapshot = () =>
      publishLivePreviewMessage(previewSessionId, {
        type: "lesson-preview",
        snapshot: toLessonLivePreviewSnapshot({
          id: lessonId,
          courseId: values.courseId,
          courseSlug: selectedCourse?.slug ?? "anteprima-contro-formazione",
          courseTitle: selectedCourse?.title ?? lessonFormText.previewCourseTitle,
          title,
          titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
          slug: resolvedSlug,
          excerptRich: values.excerptRich,
          contentRich: values.contentRich,
          imageUrl: values.imageUrl || null,
          imageAlt: values.imageAlt || null,
          audioUrl: values.audioUrl || null,
          audioChunks: values.audioChunksUrl || null,
          sortOrder: lesson?.sortOrder ?? 0,
          statusLabel,
          publicAvailable: lesson?.status === "PUBLISHED" && Boolean(lesson.publishedAt),
        }),
      });

    publishSnapshot();

    if (previewOpenCount !== handledPreviewOpenCount.current) {
      handledPreviewOpenCount.current = previewOpenCount;
      const firstRetry = window.setTimeout(publishSnapshot, 250);
      const secondRetry = window.setTimeout(publishSnapshot, 1000);

      return () => {
        window.clearTimeout(firstRetry);
        window.clearTimeout(secondRetry);
      };
    }

    return undefined;
  }, [
    coursesAvailable,
    formValues,
    getValues,
    lesson?.publishedAt,
    lesson?.sortOrder,
    lesson?.status,
    lessonFormText.newPreviewStatus,
    lessonFormText.previewCourseTitle,
    lessonId,
    mode,
    previewOpenCount,
    previewSessionId,
    resolvedSlug,
    statusOptions,
    title,
    titleStyled,
  ]);

  const handleValidSubmit = async (values: LessonFormValues) => {
    const titleStyledPayload = hasStyledTitleFormatting(titleStyled) ? titleStyled : null;

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createLessonInputSchema,
          buildCreateLessonPayload(
            values,
            hasManualSlugOverride ? values.slug : autoSlug,
            titleStyledPayload,
          ),
          payloadFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateLessonInputSchema,
        buildUpdateLessonPayload(
          values,
          lesson,
          hasManualSlugOverride ? values.slug : autoSlug,
          titleStyledPayload,
        ),
        payloadFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: lessonId!,
        data: validation.value,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  const handleInvalidSubmit = () => {
    const validation = validateFormInput(lessonFormStateSchema, getValues(), formFieldLabels);

    if (!validation.ok) {
      onValidationError(validation.message);
    }
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
    >
      <CmsPageHeader
        title={mode === "create" ? lessonFormText.createTitle : lessonFormText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={openPreview} disabled={isMutating}>
              <Eye aria-hidden />
              {text.quickActions.preview}
            </CmsActionButton>
            {mode === "edit" && lessonId ? (
              <CmsConfirmDialog
                triggerLabel={text.quickActions.delete}
                triggerIcon={<Trash2 aria-hidden />}
                triggerDisabled={isMutating}
                title={text.quickActions.confirmDeleteTitle}
                description={text.quickActions.confirmDeleteSingleLesson}
                tone="danger"
                onConfirm={() => onDelete(lessonId)}
              />
            ) : null}
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isMutating}>
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isMutating}>
              {mode === "create" ? <Plus aria-hidden /> : <Save aria-hidden />}
              {mode === "create" ? text.forms.create : text.forms.save}
            </CmsActionButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto pb-6 lg:pr-6">
          <CmsFormField
            label={fieldText.title}
            htmlFor="lesson-title"
            hint={lessonFormText.titleStyledHint}
            required
          >
            <CmsStyledTitleEditor
              id="lesson-title"
              value={titleStyled}
              onChange={handleTitleChange}
              placeholder={fieldText.title}
              accentLabel={lessonFormText.titleStyledAccentAction}
              lineBreakLabel={lessonFormText.titleStyledLineBreakAction}
              ariaLabel={lessonFormText.titleStyledEditorAriaLabel}
            />
            <input type="hidden" {...register("title")} />
          </CmsFormField>

          <CmsFormField label={fieldText.slug} htmlFor="lesson-slug" required hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <Controller
                  name="slug"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsTextInput
                      id="lesson-slug"
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
                  onClick={openSlugEditor}
                  className={cn(
                    "flex h-10 flex-1 cursor-pointer items-center rounded-[6px] border border-foreground bg-card px-3 text-left",
                    "font-ui text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-surface-hover",
                    resolvedSlug ? "text-foreground" : "text-border",
                  )}
                >
                  {slugPreview}
                </button>
              )}

              <button
                type="button"
                onClick={regenerateSlugFromTitle}
                className={cn(
                  "inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[6px] border border-foreground bg-card px-3",
                  "font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover",
                )}
              >
                {formText.regenerateSlug}
              </button>
            </div>
          </CmsFormField>

          <CmsFormField
            label={lessonFormText.contentFieldLabel}
            htmlFor="lesson-content-rich"
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
                  ariaLabel={lessonFormText.contentEditorAriaLabel}
                  fullHeight
                  enableNotes
                />
              )}
            />
          </CmsFormField>

          <CmsFormField label={fieldText.excerpt} htmlFor="lesson-excerpt-rich">
            <Controller
              name="excerptRich"
              control={control}
              render={({ field }) => (
                <CmsRichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  ariaLabel={lessonFormText.excerptEditorAriaLabel}
                />
              )}
            />
          </CmsFormField>
        </div>

        <div className="cms-scroll min-h-0 min-w-0 space-y-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {lessonFormText.publishingSection}
            </div>

            {mode === "edit" ? (
              <CmsFormField label={listText.table.status} htmlFor="lesson-status" required>
                <Controller
                  name="status"
                  control={control}
                  render={({ field, fieldState }) => (
                    <CmsSelect
                      value={field.value}
                      state={fieldState.error ? "error" : undefined}
                      onValueChange={(value) => field.onChange(value as LessonEditorialStatus)}
                      options={statusOptions}
                    />
                  )}
                />
              </CmsFormField>
            ) : (
              <div
                className={cn(
                  "rounded-[6px] border border-dashed border-border px-3 py-2",
                  cmsMetaLabelClass,
                )}
              >
                {lessonFormText.createStatusHint}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {lessonFormText.courseSection}
            </div>

            <CmsFormField label={lessonFormText.courseFieldLabel} htmlFor="lesson-course" required>
              <Controller
                name="courseId"
                control={control}
                render={({ field, fieldState }) => (
                  <CmsSearchSelect
                    value={field.value}
                    state={fieldState.error ? "error" : undefined}
                    onValueChange={field.onChange}
                    options={courseOptions}
                    disabled={coursesLoading}
                    loading={coursesLoading}
                  />
                )}
              />
            </CmsFormField>
          </section>

          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {lessonFormText.mediaSection}
            </div>

            <div className="space-y-4">
              <CmsFormField label={fieldText.imageUrl} htmlFor="lesson-image-url">
                <div className="space-y-3">
                  {imageUrl ? (
                    <ArticleMediaFieldPreview kind="image" url={imageUrl} />
                  ) : (
                    <div className="flex aspect-16/10 items-center justify-center border border-dashed border-border bg-card-hover px-6 text-center">
                      <div className="space-y-1.5">
                        <CmsMetaText variant="category">
                          {lessonFormText.imagePlaceholderTitle}
                        </CmsMetaText>
                        <CmsBody size="sm" tone="muted">
                          {lessonFormText.imagePlaceholderDescription}
                        </CmsBody>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      disabled={isMutating}
                      onClick={() => setIsImagePickerOpen(true)}
                    >
                      {lessonFormText.openImageLibrary}
                    </CmsActionButton>
                    {imageUrl ? (
                      <CmsActionButton
                        variant="ghost"
                        size="xs"
                        disabled={isMutating}
                        onClick={() => {
                          setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true });
                          setValue("imageAlt", "", { shouldDirty: true, shouldValidate: true });
                        }}
                      >
                        {lessonFormText.clearMediaField}
                      </CmsActionButton>
                    ) : null}
                  </div>
                </div>
              </CmsFormField>

              <CmsFormField
                label={fieldText.imageAlt}
                htmlFor="lesson-image-alt"
                hint={lessonFormText.imageAltHint}
              >
                <CmsTextInput
                  id="lesson-image-alt"
                  value={imageAlt}
                  disabled={isMutating || !imageUrl}
                  placeholder={fieldText.imageAlt}
                  onChange={(event) =>
                    setValue("imageAlt", event.target.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </CmsFormField>

              <CmsFormField label={fieldText.audioUrl} htmlFor="lesson-audio-url">
                <div className="space-y-3">
                  {audioUrl ? (
                    <ArticleMediaFieldPreview kind="audio" url={audioUrl} />
                  ) : (
                    <div className="flex aspect-16/10 items-center justify-center border border-dashed border-border bg-card-hover px-6 text-center">
                      <div className="space-y-1.5">
                        <CmsMetaText variant="category">
                          {lessonFormText.audioPlaceholderTitle}
                        </CmsMetaText>
                        <CmsBody size="sm" tone="muted">
                          {lessonFormText.audioPlaceholderDescription}
                        </CmsBody>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      disabled={isMutating}
                      onClick={() => setIsAudioPickerOpen(true)}
                    >
                      {lessonFormText.openAudioLibrary}
                    </CmsActionButton>
                    {audioUrl ? (
                      <CmsActionButton
                        variant="ghost"
                        size="xs"
                        disabled={isMutating}
                        onClick={() =>
                          setValue("audioUrl", "", { shouldDirty: true, shouldValidate: true })
                        }
                      >
                        {lessonFormText.clearMediaField}
                      </CmsActionButton>
                    ) : null}
                  </div>
                </div>
              </CmsFormField>

              <CmsFormField label={fieldText.audioChunksUrl} htmlFor="lesson-audio-chunks-url">
                <div className="space-y-3">
                  {audioChunksUrl ? (
                    <ArticleMediaFieldPreview kind="json" url={audioChunksUrl} />
                  ) : (
                    <div className="flex aspect-16/10 items-center justify-center border border-dashed border-border bg-card-hover px-6 text-center">
                      <div className="space-y-1.5">
                        <CmsMetaText variant="category">
                          {lessonFormText.jsonPlaceholderTitle}
                        </CmsMetaText>
                        <CmsBody size="sm" tone="muted">
                          {lessonFormText.jsonPlaceholderDescription}
                        </CmsBody>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <CmsActionButton
                      variant="outline"
                      size="xs"
                      disabled={isMutating}
                      onClick={() => setIsJsonPickerOpen(true)}
                    >
                      {lessonFormText.openJsonLibrary}
                    </CmsActionButton>
                    {audioChunksUrl ? (
                      <CmsActionButton
                        variant="ghost"
                        size="xs"
                        disabled={isMutating}
                        onClick={() =>
                          setValue("audioChunksUrl", "", {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        {lessonFormText.clearMediaField}
                      </CmsActionButton>
                    ) : null}
                  </div>
                </div>
              </CmsFormField>
            </div>
          </section>
        </div>
      </div>

      <CmsMediaPickerDialog
        open={isImagePickerOpen}
        onOpenChange={setIsImagePickerOpen}
        title={lessonFormText.imageLibraryTitle}
        description={lessonFormText.imageLibraryDescription}
        selectActionLabel={lessonFormText.selectImage}
        allowedKinds={["image"]}
        selectionMode="select-inline"
        onSelectUrl={(url) =>
          setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true })
        }
      />

      <CmsMediaPickerDialog
        open={isAudioPickerOpen}
        onOpenChange={setIsAudioPickerOpen}
        title={lessonFormText.audioLibraryTitle}
        description={lessonFormText.audioLibraryDescription}
        selectActionLabel={lessonFormText.selectAudio}
        allowedKinds={["audio"]}
        onSelectUrl={(url) =>
          setValue("audioUrl", url, { shouldDirty: true, shouldValidate: true })
        }
      />

      <CmsMediaPickerDialog
        open={isJsonPickerOpen}
        onOpenChange={setIsJsonPickerOpen}
        title={lessonFormText.jsonLibraryTitle}
        description={lessonFormText.jsonLibraryDescription}
        selectActionLabel={lessonFormText.selectJson}
        allowedKinds={["json"]}
        onSelectUrl={(url) =>
          setValue("audioChunksUrl", url, { shouldDirty: true, shouldValidate: true })
        }
      />
    </form>
  );
}
