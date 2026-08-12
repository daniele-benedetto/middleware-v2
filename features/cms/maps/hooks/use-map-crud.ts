"use client";

import { trpc } from "@/lib/trpc/react";

import type { RouterInputs, RouterOutputs } from "@/lib/trpc/types";

type CreateMapInput = RouterInputs["maps"]["create"];
type UpdateMapInput = RouterInputs["maps"]["update"]["data"];
type CreateMapItemInput = RouterInputs["maps"]["createItem"];
type UpdateMapItemInput = RouterInputs["maps"]["updateItem"]["data"];
type MapDetail = RouterOutputs["maps"]["getById"];

export function useMapById(mapId?: string, options?: { initialData?: MapDetail }) {
  return trpc.maps.getById.useQuery(
    { id: mapId ?? "" },
    { enabled: Boolean(mapId), staleTime: 30_000, initialData: options?.initialData },
  );
}

export function useMapCreate() {
  return trpc.maps.create.useMutation();
}

export function useMapUpdate() {
  return trpc.maps.update.useMutation();
}

export function useMapItemCreate() {
  return trpc.maps.createItem.useMutation();
}

export function useMapItemUpdate() {
  return trpc.maps.updateItem.useMutation();
}

export function useMapItemDelete() {
  return trpc.maps.deleteItem.useMutation();
}

export type { CreateMapInput, CreateMapItemInput, MapDetail, UpdateMapInput, UpdateMapItemInput };
