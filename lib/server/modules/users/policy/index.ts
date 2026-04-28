import { USER_ROLES } from "@/lib/server/auth/roles";

export const usersPolicy = {
  listAllowedRoles: [USER_ROLES.ADMIN],
  listAuthorsAllowedRoles: [USER_ROLES.ADMIN, USER_ROLES.EDITOR],
  readAllowedRoles: [USER_ROLES.ADMIN],
  createAllowedRoles: [USER_ROLES.ADMIN],
  updateAllowedRoles: [USER_ROLES.ADMIN],
  updateRoleAllowedRoles: [USER_ROLES.ADMIN],
  deleteAllowedRoles: [USER_ROLES.ADMIN],
} as const;
