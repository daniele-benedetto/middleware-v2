"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateCategoryInput = RouterInputs["categories"]["create"];
type UpdateCategoryInput = RouterInputs["categories"]["update"]["data"];
type CategoryDetail = RouterOutputs["categories"]["getById"];

export function useCategoryById(categoryId?: string, options?: { initialData?: CategoryDetail }) {
  return trpc.categories.getById.useQuery(
    { id: categoryId ?? "" },
    {
      enabled: Boolean(categoryId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useCategoryCreate() {
  return trpc.categories.create.useMutation();
}

export function useCategoryUpdate() {
  return trpc.categories.update.useMutation();
}

export type { CategoryDetail, CreateCategoryInput, UpdateCategoryInput };
