"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs } from "@/lib/trpc/types";

type CreateMapInput = RouterInputs["maps"]["create"];

export function useMapCreate() {
  return trpc.maps.create.useMutation();
}

export type { CreateMapInput };
