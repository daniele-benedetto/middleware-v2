import { UserRole } from "@/lib/generated/prisma/enums";

export const observabilityPerformancePolicy = {
  allowedRoles: [UserRole.ADMIN],
} as const;
