"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

type CreateIssueInput = RouterInputs["issues"]["create"];
type UpdateIssueInput = RouterInputs["issues"]["update"]["data"];

export function useIssueById(issueId?: string) {
  return trpc.issues.getById.useQuery(
    { id: issueId ?? "" },
    {
      enabled: Boolean(issueId),
      staleTime: 30_000,
    },
  );
}

export function useIssueCreate() {
  return trpc.issues.create.useMutation();
}

export function useIssueUpdate() {
  return trpc.issues.update.useMutation();
}

export type { CreateIssueInput, UpdateIssueInput };
