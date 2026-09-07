import { USER_ROLES } from "@/lib/server/auth/roles";
export const questionnairesPolicy = {
  allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.EDITOR],
  resultsRoles: [USER_ROLES.ADMIN],
} as const;
