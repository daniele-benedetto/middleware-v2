export const auditLogOutcomeValues = ["SUCCESS", "FAILURE"] as const;
export const auditLogResourceValues = [
  "articles",
  "categories",
  "issues",
  "media",
  "tags",
  "users",
  "unknown",
] as const;
export const auditLogSortByValues = ["createdAt"] as const;

export type AuditLogOutcomeValue = (typeof auditLogOutcomeValues)[number];
export type AuditLogResourceValue = (typeof auditLogResourceValues)[number];
export type AuditLogSortByValue = (typeof auditLogSortByValues)[number];
