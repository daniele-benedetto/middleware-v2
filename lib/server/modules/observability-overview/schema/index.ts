import { z } from "zod";

export const observabilityInsightTypeValues = [
  "critical_error_regression",
  "blocking_error_with_exits",
  "high_interest_poor_performance",
  "opened_not_read",
  "content_quality_opportunity",
  "release_performance_regression",
  "release_error_regression",
  "audit_risk_followed_by_error",
  "audit_failure_sensitive_action",
  "referrer_quality_opportunity",
] as const;

export const observabilityInsightSeverityValues = ["low", "medium", "high", "critical"] as const;

export const observabilityInsightEntityTypeValues = [
  "content",
  "path",
  "error_group",
  "audit_activity",
  "release",
  "referrer",
  "performance_segment",
  "unknown",
] as const;

export const observabilityInsightTypeSchema = z.enum(observabilityInsightTypeValues);
export const observabilityInsightSeveritySchema = z.enum(observabilityInsightSeverityValues);
export const observabilityInsightEntityTypeSchema = z.enum(observabilityInsightEntityTypeValues);

export const observabilityOverviewQuerySchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
  pageType: z.string().trim().min(1).max(80).optional(),
  contentType: z.string().trim().min(1).max(80).optional(),
  contentId: z.string().trim().min(1).max(120).optional(),
  path: z.string().trim().min(1).max(512).optional(),
  release: z.string().trim().min(1).max(120).optional(),
  severity: z.string().trim().min(1).max(80).optional(),
  riskLevel: z.string().trim().min(1).max(80).optional(),
  includeLowConfidence: z.boolean().default(false),
  limit: z.number().int().min(1).max(25).default(12),
});

export type ObservabilityInsightType = z.infer<typeof observabilityInsightTypeSchema>;
export type ObservabilityInsightSeverity = z.infer<typeof observabilityInsightSeveritySchema>;
export type ObservabilityInsightEntityType = z.infer<typeof observabilityInsightEntityTypeSchema>;
export type ObservabilityOverviewQuery = z.infer<typeof observabilityOverviewQuerySchema>;
