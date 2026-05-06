import { USER_ROLES } from "@/lib/server/auth/roles";

export const auditLogsPolicy = {
  allowedRoles: [USER_ROLES.ADMIN],
} as const;
