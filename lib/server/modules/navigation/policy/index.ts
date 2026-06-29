import type { UserRole } from "@/lib/server/auth/roles";

export const navigationPolicy = {
  allowedRoles: ["ADMIN", "EDITOR"] satisfies UserRole[],
};
