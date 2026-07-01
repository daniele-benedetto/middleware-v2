import "server-only";

import type { UserRole } from "@/lib/server/auth/roles";

export const observabilityOverviewPolicy = {
  allowedRoles: ["ADMIN", "EDITOR"] satisfies UserRole[],
};

export function canReadObservabilityOverview(role: UserRole) {
  return observabilityOverviewPolicy.allowedRoles.includes(role);
}
