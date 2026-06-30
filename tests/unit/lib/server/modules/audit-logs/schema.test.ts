import { auditLogResourceValues } from "@/lib/audit-logs/constants";
import { auditLogDtoSchema } from "@/lib/server/modules/audit-logs/dto";
import { listAuditLogsQuerySchema } from "@/lib/server/modules/audit-logs/schema";

const baseAuditLog = {
  id: "00000000-0000-4000-8000-000000000001",
  actorId: null,
  actorDisplayName: null,
  actorEmail: null,
  actorRole: null,
  action: "update",
  resourceId: null,
  outcome: "SUCCESS",
  errorCode: null,
  errorMessage: null,
  method: "POST",
  path: "/api/trpc/pages.update",
  ipAddress: null,
  userAgent: null,
  requestId: null,
  metadata: null,
  createdAt: "2026-06-30T10:00:00.000Z",
};

describe("audit log schemas", () => {
  it.each(auditLogResourceValues)("accepts %s resource output", (resource) => {
    expect(auditLogDtoSchema.safeParse({ ...baseAuditLog, resource }).success).toBe(true);
  });

  it.each(auditLogResourceValues)("accepts %s resource filters", (resource) => {
    expect(listAuditLogsQuerySchema.safeParse({ resource }).success).toBe(true);
  });
});
