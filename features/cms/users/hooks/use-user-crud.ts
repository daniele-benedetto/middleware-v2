"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

type CreateUserInput = RouterInputs["users"]["create"];
type UpdateUserInput = RouterInputs["users"]["update"]["data"];

export function useUserById(userId?: string) {
  return trpc.users.getById.useQuery(
    { id: userId ?? "" },
    {
      enabled: Boolean(userId),
      staleTime: 30_000,
    },
  );
}

export function useUserCreate() {
  return trpc.users.create.useMutation();
}

export function useUserUpdate() {
  return trpc.users.update.useMutation();
}

export type { CreateUserInput, UpdateUserInput };
