"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateIssueInput = RouterInputs["issues"]["create"];
type UpdateIssueInput = RouterInputs["issues"]["update"]["data"];
type IssueDetail = RouterOutputs["issues"]["getById"];

export function useIssueById(issueId?: string, options?: { initialData?: IssueDetail }) {
  return trpc.issues.getById.useQuery(
    { id: issueId ?? "" },
    {
      enabled: Boolean(issueId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useIssueCreate() {
  return trpc.issues.create.useMutation();
}

export function useIssueUpdate() {
  return trpc.issues.update.useMutation();
}

export type { CreateIssueInput, IssueDetail, UpdateIssueInput };
