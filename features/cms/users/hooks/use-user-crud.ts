"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateUserInput = RouterInputs["users"]["create"];
type UpdateUserInput = RouterInputs["users"]["update"]["data"];
type UpdateUserRoleInput = RouterInputs["users"]["updateRole"]["data"];
type UserDetail = RouterOutputs["users"]["getById"];

export function useUserById(userId?: string, options?: { initialData?: UserDetail }) {
  return trpc.users.getById.useQuery(
    { id: userId ?? "" },
    {
      enabled: Boolean(userId),
      staleTime: 30_000,
      initialData: options?.initialData,
    },
  );
}

export function useUserCreate() {
  return trpc.users.create.useMutation();
}

export function useUserUpdate() {
  return trpc.users.update.useMutation();
}

export function useUserUpdateRole() {
  return trpc.users.updateRole.useMutation();
}

export type { CreateUserInput, UpdateUserInput, UpdateUserRoleInput, UserDetail };
