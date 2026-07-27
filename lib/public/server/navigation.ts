import "server-only";

import { navigationService } from "@/lib/server/modules/navigation";

import type { PublicNavigationDto } from "@/lib/server/modules/navigation/dto";

const emptyPublicNavigation: PublicNavigationDto = {
  main: [],
  footerSections: [],
  footerLegal: [],
};

export async function getPublicNavigation() {
  try {
    return await navigationService.getPublicNavigation();
  } catch (error) {
    console.error("public.getPublicNavigation failed", { error });
    return emptyPublicNavigation;
  }
}
