"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateAuthorInput = RouterInputs["authors"]["create"];
type UpdateAuthorInput = RouterInputs["authors"]["update"]["data"];
type AuthorDetail = RouterOutputs["authors"]["getById"];

export function useAuthorById(authorId?: string, options?: { initialData?: AuthorDetail }) {
  return trpc.authors.getById.useQuery(
    { id: authorId ?? "" },
    {
      enabled: Boolean(authorId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useAuthorCreate() {
  return trpc.authors.create.useMutation();
}

export function useAuthorUpdate() {
  return trpc.authors.update.useMutation();
}

export type { AuthorDetail, CreateAuthorInput, UpdateAuthorInput };
