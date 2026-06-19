import "server-only";

import { cache } from "react";

import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterOutputs } from "@/lib/trpc/types";

export type PublicCurrentIssueDetail = RouterOutputs["public"]["issues"]["getCurrent"];

export const getCurrentIssueDetail = cache(async (): Promise<PublicCurrentIssueDetail | null> => {
  try {
    const caller = await getTrpcCaller();
    return await caller.public.issues.getCurrent();
  } catch (error) {
    console.error("public.getCurrentIssueDetail failed", error);
    return null;
  }
});
