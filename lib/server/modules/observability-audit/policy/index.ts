import type { UserRole } from "@/lib/server/auth/roles";

export const observabilityAuditPolicy = {
  allowedRoles: ["ADMIN"] as UserRole[],
};
