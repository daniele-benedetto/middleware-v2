import { USER_ROLES } from "@/lib/server/auth/roles";

export const telemetryPolicy = {
  allowedRoles: [USER_ROLES.ADMIN],
} as const;
