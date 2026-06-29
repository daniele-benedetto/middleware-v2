import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { PUBLIC_NAVIGATION_CACHE_TAG } from "@/lib/public/server/navigation-cache";
import { navigationService } from "@/lib/server/modules/navigation";

export async function getPublicNavigation() {
  "use cache";
  cacheLife("hours");
  cacheTag(PUBLIC_NAVIGATION_CACHE_TAG);

  return navigationService.getPublicNavigation();
}
