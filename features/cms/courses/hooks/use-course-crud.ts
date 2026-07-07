"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateCourseInput = RouterInputs["courses"]["create"];
type UpdateCourseInput = RouterInputs["courses"]["update"]["data"];
type CourseDetail = RouterOutputs["courses"]["getById"];

export function useCourseById(courseId?: string, options?: { initialData?: CourseDetail }) {
  return trpc.courses.getById.useQuery(
    { id: courseId ?? "" },
    {
      enabled: Boolean(courseId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useCourseCreate() {
  return trpc.courses.create.useMutation();
}

export function useCourseUpdate() {
  return trpc.courses.update.useMutation();
}

export type { CourseDetail, CreateCourseInput, UpdateCourseInput };
