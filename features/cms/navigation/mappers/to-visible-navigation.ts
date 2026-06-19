import { cmsNavigation } from "@/lib/cms/navigation";

import type { UserRole } from "@/lib/server/auth/roles";

export function toVisibleNavigation(role?: UserRole | null) {
  return cmsNavigation.filter((item) => {
    if (item.adminOnly && role !== "ADMIN") {
      return false;
    }
    return true;
  });
}
