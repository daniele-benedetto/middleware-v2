"use client";

import { useCallback } from "react";

import { mapTrpcErrorToCmsUiMessage } from "@/lib/cms/trpc";

export function useCmsMutationErrorMapper() {
  return useCallback((error: unknown) => mapTrpcErrorToCmsUiMessage(error), []);
}
