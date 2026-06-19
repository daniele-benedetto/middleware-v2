import "server-only";

import { cache } from "react";

import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterOutputs } from "@/lib/trpc/types";

export type PublicIssueListItem =
  RouterOutputs["public"]["issues"]["listPublished"]["items"][number];

const MAX_ISSUES_PAGE_SIZE = 100;

export const getPublishedIssues = cache(async (): Promise<PublicIssueListItem[]> => {
  try {
    const caller = await getTrpcCaller();
    const result = await caller.public.issues.listPublished({
      page: 1,
      pageSize: MAX_ISSUES_PAGE_SIZE,
    });
    return result.items;
  } catch (error) {
    console.error("public.getPublishedIssues failed", error);
    return [];
  }
});
