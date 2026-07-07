"use client";

import { cmsOptionsQueryOptions } from "@/features/cms/shared/hooks";
import { lessonCourseOptionsInput } from "@/lib/cms/course-options";
import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateLessonInput = RouterInputs["lessons"]["create"];
type UpdateLessonInput = RouterInputs["lessons"]["update"]["data"];
type LessonDetail = RouterOutputs["lessons"]["getById"];
type CourseOptionsOutput = RouterOutputs["courses"]["list"];

export function useLessonById(lessonId?: string, options?: { initialData?: LessonDetail }) {
  return trpc.lessons.getById.useQuery(
    { id: lessonId ?? "" },
    {
      enabled: Boolean(lessonId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useLessonCreate() {
  return trpc.lessons.create.useMutation();
}

export function useLessonUpdate() {
  return trpc.lessons.update.useMutation();
}

export function useCourseOptions(options?: { initialData?: CourseOptionsOutput }) {
  return trpc.courses.list.useQuery(lessonCourseOptionsInput, {
    ...cmsOptionsQueryOptions,
    initialData: options?.initialData,
  });
}

export type { CreateLessonInput, LessonDetail, UpdateLessonInput };
