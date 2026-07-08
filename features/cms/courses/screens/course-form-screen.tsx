"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, Eye, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CmsConfirmDialog, CmsErrorState } from "@/components/cms/common";
import {
  CmsActionButton,
  CmsCheckbox,
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CmsCourseFormLoading } from "@/features/cms/courses/components/course-form-loading";
import { CourseLessonsPanel } from "@/features/cms/courses/components/course-lessons-panel";
import {
  useCourseById,
  useCourseCreate,
  useCourseUpdate,
  type CourseDetail,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/features/cms/courses/hooks/use-course-crud";
import { publishLivePreviewMessage } from "@/features/cms/preview/use-live-preview";
import {
  mapCrudDomainError,
  useCmsFormNavigation,
  validateFormInput,
} from "@/features/cms/shared/forms";
import { createLivePreviewSessionId, toCourseLivePreviewSnapshot } from "@/lib/cms/preview/live";
import { invalidateAfterCmsMutation } from "@/lib/cms/trpc";
import { i18n } from "@/lib/i18n";
import {
  createCourseInputSchema,
  updateCourseInputSchema,
} from "@/lib/server/modules/courses/schema";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { normalizeSlug } from "@/lib/validation/slug";

import type { PublicCourseLessonSummaryDto } from "@/lib/server/modules/courses/dto/public";
import type { CourseHomeVariant } from "@/lib/server/modules/courses/schema";

const emptyContentDoc = { type: "doc", content: [{ type: "paragraph" }] };

const courseHomeVariantOptions = [
  { value: "black", labelKey: "homeVariantBlack" },
  { value: "red", labelKey: "homeVariantRed" },
  { value: "default", labelKey: "homeVariantDefault" },
] as const;

type CourseFormScreenProps = {
  mode: "create" | "edit";
  courseId?: string;
  initialData?: CourseDetail;
};

type CourseUpdatePayload = {
  id: string;
  data: UpdateCourseInput;
};

function normalizePickedDate(value: Date) {
  const next = new Date(value);
  next.setHours(12, 0, 0, 0);
  return next;
}

function CoursePublishedDatePicker({
  value,
  placeholder,
  clearLabel,
  onChange,
}: {
  value: Date | null;
  placeholder: string;
  clearLabel: string;
  onChange: (value: Date | null) => void;
}) {
  const formattedValue = value ? format(value, "dd/MM/yyyy") : placeholder;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-10 flex-1 cursor-pointer items-center justify-between gap-3 rounded-[6px] border border-foreground bg-card px-3 text-left",
                "font-ui text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-surface-hover",
                value ? "text-foreground" : "text-border",
              )}
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="truncate">{formattedValue}</span>
          </span>
          <span className="shrink-0 text-[10px] tracking-[0.08em] text-muted-foreground">
            {i18n.cms.forms.dateShort}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-[20rem] rounded-[8px] border border-foreground bg-card p-0 shadow-none">
          <Calendar
            key={value ? format(value, "yyyy-MM-dd") : "empty-date"}
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => {
              if (date) {
                onChange(normalizePickedDate(date));
              }
            }}
          />
        </PopoverContent>
      </Popover>

      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[6px] border border-foreground bg-card px-3",
            "font-ui text-[10px] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover",
          )}
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}

export function CmsCourseFormScreen({ mode, courseId, initialData }: CourseFormScreenProps) {
  const trpcUtils = trpc.useUtils();
  const { cancel, success } = useCmsFormNavigation("/cms/contro-formazioni");
  const text = i18n.cms;
  const formText = text.forms;
  const courseFormText = formText.resources.courses;
  const courseQuery = useCourseById(mode === "edit" ? courseId : undefined, { initialData });
  const createMutation = useCourseCreate();
  const updateMutation = useCourseUpdate();
  const deleteMutation = trpc.courses.delete.useMutation();

  if (mode === "edit" && !courseId) {
    return (
      <CmsErrorState
        title={courseFormText.invalidTitle}
        description={formText.invalidEditIdDescription}
      />
    );
  }

  if (mode === "edit" && courseQuery.isPending) {
    return <CmsCourseFormLoading />;
  }

  if (mode === "edit" && courseQuery.isError) {
    const mapped = mapCrudDomainError(courseQuery.error, "courses");
    return <CmsErrorState title={mapped.title} description={mapped.description} />;
  }

  return (
    <CourseFormContent
      key={mode === "edit" ? (courseQuery.data?.id ?? courseId) : "create"}
      mode={mode}
      courseId={courseId}
      course={courseQuery.data}
      isMutating={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
      onCancel={cancel}
      onCreate={async (payload) => {
        await createMutation.mutateAsync(payload);
        await invalidateAfterCmsMutation(trpcUtils, "courses.create");
        success(courseFormText.created);
      }}
      onUpdate={async ({ id, data }) => {
        await updateMutation.mutateAsync({ id, data });
        await invalidateAfterCmsMutation(trpcUtils, "courses.update", { id });
        success(courseFormText.updated);
      }}
      onDelete={async (id) => {
        await deleteMutation.mutateAsync({ id });
        await invalidateAfterCmsMutation(trpcUtils, "courses.delete", { id });
        success();
      }}
      onMutationError={(error) => {
        const mapped = mapCrudDomainError(error, "courses");
        cmsToast.error(mapped.description, mapped.title);
      }}
      onValidationError={(message) => {
        cmsToast.error(message, text.trpcErrors.badRequestTitle);
      }}
    />
  );
}

type CourseFormContentProps = {
  mode: "create" | "edit";
  courseId?: string;
  course?: CourseDetail;
  isMutating: boolean;
  onCancel: () => void;
  onCreate: (payload: CreateCourseInput) => Promise<void>;
  onUpdate: (payload: CourseUpdatePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMutationError: (error: unknown) => void;
  onValidationError: (message: string) => void;
};

type CourseLessonState = {
  id: string;
  title: string;
};

function CourseFormContent({
  mode,
  courseId,
  course,
  isMutating,
  onCancel,
  onCreate,
  onUpdate,
  onDelete,
  onMutationError,
  onValidationError,
}: CourseFormContentProps) {
  const trpcUtils = trpc.useUtils();
  const text = i18n.cms;
  const formText = text.forms;
  const courseFormText = formText.resources.courses;
  const listText = text.lists.courses;
  const fieldText = formText.fields;
  const courseFieldLabels = {
    title: fieldText.title,
    titleStyled: fieldText.titleStyled,
    slug: fieldText.slug,
    description: fieldText.description,
    homeVariant: courseFormText.homeVariantLabel,
    publishedAt: fieldText.publishedAt,
  };

  const homeVariantOptions = courseHomeVariantOptions.map((option) => ({
    value: option.value,
    label: courseFormText[option.labelKey],
  }));

  const reorderMutation = trpc.lessons.reorder.useMutation();

  const [titleStyled, setTitleStyled] = useState(() =>
    createStyledTitleValue(course?.title ?? "", course?.titleStyled),
  );
  const title = getStyledTitlePlainText(titleStyled);
  const [description, setDescription] = useState<unknown>(course?.description ?? emptyContentDoc);
  const [homeVariant, setHomeVariant] = useState<CourseHomeVariant>(course?.homeVariant ?? "black");
  const [isActive, setIsActive] = useState(course?.isActive ?? true);
  const [publishedAt, setPublishedAt] = useState<Date | null>(
    course?.publishedAt ? new Date(course.publishedAt) : null,
  );

  const initialLessons = useMemo<CourseLessonState[]>(
    () => (course?.lessons ?? []).map((lesson) => ({ id: lesson.id, title: lesson.title })),
    [course?.lessons],
  );
  const [lessons, setLessons] = useState<CourseLessonState[]>(initialLessons);

  const initialAutoSlug = useMemo(() => normalizeSlug(course?.title ?? ""), [course?.title]);
  const [manualSlug, setManualSlug] = useState(course?.slug ?? "");
  const [hasManualSlugOverride, setHasManualSlugOverride] = useState(
    Boolean(course?.slug) && course?.slug !== initialAutoSlug,
  );
  const [isSlugEditing, setIsSlugEditing] = useState(false);
  const [previewSessionId] = useState(() =>
    mode === "edit" && courseId ? courseId : createLivePreviewSessionId(),
  );
  const [previewOpenCount, setPreviewOpenCount] = useState(0);
  const handledPreviewOpenCount = useRef(0);

  const autoSlug = normalizeSlug(title);
  const resolvedSlug = hasManualSlugOverride ? manualSlug : autoSlug;
  const slugPreview = resolvedSlug || courseFormText.slugPreviewPlaceholder;

  const previewLessons = useMemo<PublicCourseLessonSummaryDto[]>(
    () =>
      lessons.map((lesson, index) => ({
        id: lesson.id,
        slug: normalizeSlug(lesson.title) || lesson.id,
        title: lesson.title,
        titleStyled: null,
        excerpt: null,
        imageUrl: null,
        imageAlt: null,
        hasAudio: false,
        sortOrder: index,
        readingTimeMinutes: 1,
        publishedAt: new Date().toISOString(),
      })),
    [lessons],
  );
  const slugHint = hasManualSlugOverride
    ? courseFormText.slugManualHint
    : formText.generatedFromTitleHint;

  const isBusy = isMutating;

  const openSlugEditor = () => {
    setManualSlug(resolvedSlug);
    setIsSlugEditing(true);
  };

  const regenerateSlugFromTitle = () => {
    setManualSlug(autoSlug);
    setHasManualSlugOverride(false);
    setIsSlugEditing(false);
  };

  const openPreview = () => {
    const previewPath =
      mode === "edit" && courseId
        ? `/cms/contro-formazioni/${courseId}/preview`
        : `/cms/contro-formazioni/new/preview?session=${encodeURIComponent(previewSessionId)}`;
    window.open(previewPath, "_blank", "noreferrer");
    setPreviewOpenCount((count) => count + 1);
  };

  useEffect(() => {
    const statusLabel =
      mode === "create"
        ? courseFormText.newPreviewStatus
        : text.preview.courseStatus(isActive, Boolean(publishedAt));

    const publishSnapshot = () =>
      publishLivePreviewMessage(previewSessionId, {
        type: "course-preview",
        snapshot: toCourseLivePreviewSnapshot({
          id: courseId,
          title,
          titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
          slug: resolvedSlug,
          description,
          homeVariant,
          lessons: previewLessons,
          statusLabel,
          publicAvailable: Boolean(course?.isActive && course.publishedAt),
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
    course?.isActive,
    course?.publishedAt,
    courseFormText.newPreviewStatus,
    courseId,
    description,
    homeVariant,
    isActive,
    mode,
    previewLessons,
    previewOpenCount,
    previewSessionId,
    publishedAt,
    resolvedSlug,
    text.preview,
    title,
    titleStyled,
  ]);

  const handleSubmit = async () => {
    if (publishedAt && Number.isNaN(publishedAt.getTime())) {
      onValidationError(courseFormText.invalidPublishedAt);
      return;
    }

    const slugPayload = hasManualSlugOverride ? manualSlug : resolvedSlug || undefined;

    try {
      if (mode === "create") {
        const validation = validateFormInput(
          createCourseInputSchema,
          {
            title,
            titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
            slug: slugPayload,
            description,
            homeVariant,
            isActive,
            publishedAt: publishedAt ?? undefined,
          },
          courseFieldLabels,
        );

        if (!validation.ok) {
          onValidationError(validation.message);
          return;
        }

        await onCreate(validation.value);
        return;
      }

      const validation = validateFormInput(
        updateCourseInputSchema,
        {
          title,
          titleStyled: hasStyledTitleFormatting(titleStyled) ? titleStyled : null,
          slug: slugPayload,
          description,
          homeVariant,
          isActive,
          publishedAt,
        },
        courseFieldLabels,
      );

      if (!validation.ok) {
        onValidationError(validation.message);
        return;
      }

      await onUpdate({
        id: courseId!,
        data: validation.value,
      });
    } catch (error) {
      onMutationError(error);
    }
  };

  const handleLessonsReorder = async (orderedIds: string[]) => {
    if (!courseId) {
      return;
    }

    const previousLessons = lessons;
    const nextLessons = orderedIds
      .map((id) => previousLessons.find((lesson) => lesson.id === id))
      .filter((lesson): lesson is CourseLessonState => Boolean(lesson));

    setLessons(nextLessons);

    try {
      await reorderMutation.mutateAsync({ courseId, orderedLessonIds: orderedIds });
      await invalidateAfterCmsMutation(trpcUtils, "lessons.reorder", { id: courseId });
      cmsToast.success(listText.lessonsReorderUpdated);
    } catch (error) {
      setLessons(previousLessons);
      const mapped = mapCrudDomainError(error, "lessons");
      cmsToast.error(mapped.description, mapped.title);
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
        title={mode === "create" ? courseFormText.createTitle : courseFormText.editTitle}
        actions={
          <div className="flex items-center gap-2">
            <CmsActionButton variant="outline" onClick={openPreview} disabled={isBusy}>
              <Eye aria-hidden />
              {text.quickActions.preview}
            </CmsActionButton>
            {mode === "edit" && courseId ? (
              <CmsConfirmDialog
                triggerLabel={text.quickActions.delete}
                triggerIcon={<Trash2 aria-hidden />}
                triggerDisabled={isBusy}
                title={text.quickActions.confirmDeleteTitle}
                description={text.quickActions.confirmDeleteSingleCourse}
                tone="danger"
                onConfirm={() => onDelete(courseId)}
              />
            ) : null}
            <CmsActionButton variant="outline" onClick={onCancel} disabled={isBusy}>
              <X aria-hidden />
              {text.common.cancel}
            </CmsActionButton>
            <CmsActionButton type="submit" isLoading={isBusy}>
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
            htmlFor="course-title"
            hint={courseFormText.titleStyledHint}
            required
          >
            <CmsStyledTitleEditor
              id="course-title"
              value={titleStyled}
              onChange={setTitleStyled}
              placeholder={fieldText.title}
              accentLabel={courseFormText.titleStyledAccentAction}
              lineBreakLabel={courseFormText.titleStyledLineBreakAction}
              ariaLabel={courseFormText.titleStyledEditorAriaLabel}
            />
          </CmsFormField>

          <input type="hidden" name="title" value={title} />

          <CmsFormField label={fieldText.slug} htmlFor="course-slug" hint={slugHint}>
            <div className="flex items-center gap-2">
              {isSlugEditing ? (
                <CmsTextInput
                  id="course-slug"
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
                  "font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-surface-hover",
                )}
              >
                {formText.regenerateSlug}
              </button>
            </div>
          </CmsFormField>

          <CmsFormField
            label={fieldText.description}
            htmlFor="course-description"
            className="flex flex-1 flex-col"
          >
            <CmsRichTextEditor
              value={description}
              onChange={setDescription}
              ariaLabel={courseFormText.descriptionEditorAriaLabel}
              fullHeight
            />
          </CmsFormField>
        </div>

        <div className="cms-scroll flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto pb-6 lg:border-l lg:border-foreground lg:pl-6">
          <section className="space-y-3">
            <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {courseFormText.publishingSection}
            </div>

            <div className="space-y-4">
              <CmsFormField label={courseFormText.homeVariantLabel} htmlFor="course-home-variant">
                <CmsSelect
                  value={homeVariant}
                  disabled={isBusy}
                  options={homeVariantOptions}
                  onValueChange={(nextVariant) => setHomeVariant(nextVariant as CourseHomeVariant)}
                />
              </CmsFormField>

              <CmsCheckbox
                label={courseFormText.activeLabel}
                checked={isActive}
                onChange={setIsActive}
              />

              <CmsFormField label={fieldText.publishedAt} htmlFor="course-published-at">
                <CoursePublishedDatePicker
                  value={publishedAt}
                  placeholder={courseFormText.selectDatePlaceholder}
                  clearLabel={formText.clearDate}
                  onChange={setPublishedAt}
                />
              </CmsFormField>
            </div>
          </section>

          {mode === "edit" && courseId ? (
            <section className="flex min-h-0 flex-1 flex-col space-y-3">
              <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {courseFormText.lessonsSection}
              </div>
              <CourseLessonsPanel
                lessons={lessons}
                disabled={isBusy || reorderMutation.isPending}
                onReorder={handleLessonsReorder}
              />
            </section>
          ) : (
            <section className="space-y-3">
              <div className="font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {courseFormText.lessonsSection}
              </div>
              <div className="rounded-[6px] border border-dashed border-border px-3 py-2 font-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {courseFormText.createLessonsHint}
              </div>
            </section>
          )}
        </div>
      </div>
    </form>
  );
}
