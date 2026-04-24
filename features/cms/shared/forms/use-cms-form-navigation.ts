"use client";

import { useRouter } from "next/navigation";

import { cmsToast } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

export function useCmsFormNavigation(listPath: string) {
  const router = useRouter();

  return {
    cancel: () => {
      router.push(listPath);
    },
    success: (message: string = i18n.cms.common.actionCompleted) => {
      cmsToast.info(message);
      router.push(listPath);
      router.refresh();
    },
  };
}
