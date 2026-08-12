import { cmsNavigation } from "@/lib/cms/navigation";

import type { UserRole } from "@/lib/server/auth/roles";

export function toVisibleNavigation(role?: UserRole | null) {
  return cmsNavigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || role === "ADMIN"),
    }))
    .filter((section) => section.items.length > 0);
}
