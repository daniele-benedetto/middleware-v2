import "server-only";

import { cache } from "react";

import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterOutputs } from "@/lib/trpc/types";

export type PublicCurrentIssueSummary =
  RouterOutputs["public"]["issues"]["listPublished"]["items"][number];

export const getCurrentIssueSummary = cache(async (): Promise<PublicCurrentIssueSummary | null> => {
  try {
    const caller = await getTrpcCaller();
    const result = await caller.public.issues.listPublished({ page: 1, pageSize: 1 });
    return result.items[0] ?? null;
  } catch (error) {
    console.error("public.getCurrentIssueSummary failed", error);
    return null;
  }
});
