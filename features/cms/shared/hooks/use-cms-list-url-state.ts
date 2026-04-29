"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useCallback } from "react";

import { serializeCmsSearchParams } from "@/lib/cms/query";

type CmsListUrlStateValue = string | number | boolean | undefined;

type UseCmsListUrlStateOptions = {
  baseParams: Record<string, CmsListUrlStateValue>;
  clearSelection?: () => void;
};

export function useCmsListUrlState({ baseParams, clearSelection }: UseCmsListUrlStateOptions) {
  const router = useRouter();
  const pathname = usePathname();

  const updateSearchParams = useCallback(
    (patch: Record<string, CmsListUrlStateValue>) => {
      const nextParams = serializeCmsSearchParams({
        ...baseParams,
        ...patch,
      });

      const next = nextParams.toString();

      startTransition(() => {
        clearSelection?.();
        router.replace(next ? `${pathname}?${next}` : pathname);
      });
    },
    [baseParams, clearSelection, pathname, router],
  );

  return {
    updateSearchParams,
  };
}
