import { USER_ROLES } from "@/lib/server/auth/roles";

export const tagsPolicy = {
  allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.EDITOR],
} as const;
