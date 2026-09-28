import { auditLogResourceValues } from "@/lib/audit-logs/constants";
import { auditLogDtoSchema } from "@/lib/server/modules/audit-logs/dto";

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
  path: "/api/trpc/maps.update",
  ipAddress: null,
  userAgent: null,
  requestId: null,
  metadata: null,
  createdAt: "2026-09-28T12:00:00.000Z",
} as const;

describe("audit log DTO", () => {
  it("accepts every resource emitted by CMS audit middleware", () => {
    auditLogResourceValues.forEach((resource) => {
      expect(auditLogDtoSchema.safeParse({ ...baseAuditLog, resource }).success).toBe(true);
    });
  });

  it("keeps unknown stored resources readable", () => {
    expect(
      auditLogDtoSchema.safeParse({ ...baseAuditLog, resource: "future-resource" }).success,
    ).toBe(true);
  });
});
