import "server-only";

import type { UserRole } from "@/lib/server/auth/roles";

export function canReadObservabilityAggregates(role: UserRole) {
  return role === "ADMIN" || role === "EDITOR";
}

export function canRunObservabilityJobs(role: UserRole) {
  return role === "ADMIN";
}
