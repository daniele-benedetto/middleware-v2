import "server-only";

import { cache } from "react";

import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterOutputs } from "@/lib/trpc/types";

export type PublicCategoryListItem = RouterOutputs["public"]["categories"]["list"][number];

export const getPublicCategories = cache(async (): Promise<PublicCategoryListItem[]> => {
  try {
    const caller = await getTrpcCaller();
    return await caller.public.categories.list();
  } catch (error) {
    console.error("public.getCategories failed", error);
    return [];
  }
});
