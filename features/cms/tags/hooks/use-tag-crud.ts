"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateTagInput = RouterInputs["tags"]["create"];
type UpdateTagInput = RouterInputs["tags"]["update"]["data"];
type TagDetail = RouterOutputs["tags"]["getById"];

export function useTagById(tagId?: string, options?: { initialData?: TagDetail }) {
  return trpc.tags.getById.useQuery(
    { id: tagId ?? "" },
    {
      enabled: Boolean(tagId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useTagCreate() {
  return trpc.tags.create.useMutation();
}

export function useTagUpdate() {
  return trpc.tags.update.useMutation();
}

export type { CreateTagInput, TagDetail, UpdateTagInput };
