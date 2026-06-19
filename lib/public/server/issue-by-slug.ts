import "server-only";

import { TRPCError } from "@trpc/server";
import { cache } from "react";

import { getTrpcCaller } from "@/lib/server/trpc/caller";

import type { RouterOutputs } from "@/lib/trpc/types";

export type PublicIssueDetail = RouterOutputs["public"]["issues"]["getBySlug"];

export const getPublicIssueBySlug = cache(
  async (slug: string): Promise<PublicIssueDetail | null> => {
    try {
      const caller = await getTrpcCaller();
      return await caller.public.issues.getBySlug({ slug });
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      console.error("public.getIssueBySlug failed", { slug, error });
      return null;
    }
  },
);

function isNotFound(error: unknown): boolean {
  if (error instanceof TRPCError && error.code === "NOT_FOUND") return true;
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: unknown }).code === "NOT_FOUND";
  }
  return false;
}
