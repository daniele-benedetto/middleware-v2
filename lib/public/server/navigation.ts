import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { PUBLIC_NAVIGATION_CACHE_TAG } from "@/lib/public/server/navigation-cache";
import { navigationService } from "@/lib/server/modules/navigation";

import type { PublicNavigationDto } from "@/lib/server/modules/navigation/dto";

const emptyPublicNavigation: PublicNavigationDto = {
  main: [],
  footerSections: [],
  footerLegal: [],
};

export async function getPublicNavigation() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_NAVIGATION_CACHE_TAG);

  try {
    return await navigationService.getPublicNavigation();
  } catch (error) {
    console.error("public.getPublicNavigation failed", { error });
    return emptyPublicNavigation;
  }
}
