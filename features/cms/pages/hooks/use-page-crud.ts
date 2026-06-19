"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreatePageInput = RouterInputs["pages"]["create"];
type UpdatePageInput = RouterInputs["pages"]["update"]["data"];
type PageDetail = RouterOutputs["pages"]["getById"];

export function usePageById(pageId?: string, options?: { initialData?: PageDetail }) {
  return trpc.pages.getById.useQuery(
    { id: pageId ?? "" },
    {
      enabled: Boolean(pageId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function usePageCreate() {
  return trpc.pages.create.useMutation();
}

export function usePageUpdate() {
  return trpc.pages.update.useMutation();
}

export type { CreatePageInput, PageDetail, UpdatePageInput };
