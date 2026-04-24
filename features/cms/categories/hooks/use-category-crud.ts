"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

type CreateCategoryInput = RouterInputs["categories"]["create"];
type UpdateCategoryInput = RouterInputs["categories"]["update"]["data"];

export function useCategoryById(categoryId?: string) {
  return trpc.categories.getById.useQuery(
    { id: categoryId ?? "" },
    {
      enabled: Boolean(categoryId),
      staleTime: 30_000,
    },
  );
}

export function useCategoryCreate() {
  return trpc.categories.create.useMutation();
}

export function useCategoryUpdate() {
  return trpc.categories.update.useMutation();
}

export type { CreateCategoryInput, UpdateCategoryInput };
