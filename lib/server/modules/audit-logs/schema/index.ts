import { z } from "zod";

import {
  auditLogOutcomeValues,
  auditLogResourceValues,
  auditLogSortByValues,
} from "@/lib/audit-logs/constants";

const sortOrderSchema = z.enum(["asc", "desc"]);

export const listAuditLogsQuerySchema = z.object({
  outcome: z.enum(auditLogOutcomeValues).optional(),
  resource: z.enum(auditLogResourceValues).optional(),
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(auditLogSortByValues).default("createdAt"),
  sortOrder: sortOrderSchema.default("desc"),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
