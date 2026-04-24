"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

type CreateTagInput = RouterInputs["tags"]["create"];
type UpdateTagInput = RouterInputs["tags"]["update"]["data"];

export function useTagById(tagId?: string) {
  return trpc.tags.getById.useQuery(
    { id: tagId ?? "" },
    {
      enabled: Boolean(tagId),
      staleTime: 30_000,
    },
  );
}

export function useTagCreate() {
  return trpc.tags.create.useMutation();
}

export function useTagUpdate() {
  return trpc.tags.update.useMutation();
}

export type { CreateTagInput, UpdateTagInput };
