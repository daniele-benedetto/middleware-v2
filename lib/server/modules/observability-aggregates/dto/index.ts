import { z } from "zod";

import { observabilityAggregateDomainSchema } from "@/lib/server/modules/observability-aggregates/schema";

export const observabilityAggregationResultDtoSchema = z.object({
  jobRunId: z.string().uuid().nullable(),
  domains: z.array(observabilityAggregateDomainSchema),
  windowStart: z.string(),
  windowEnd: z.string(),
  dryRun: z.boolean(),
  processedRows: z.number().int().nonnegative(),
});

export const dailyContentQualityAggregateDtoSchema = z.object({
  date: z.string(),
  pageType: z.string(),
  contentType: z.string(),
  contentId: z.string(),
  path: z.string(),
  totalVisits: z.number().nonnegative(),
  qualifiedVisits: z.number().nonnegative(),
  completedReads: z.number().nonnegative(),
  qualityScore: z.number().int().min(0).max(100),
  qualityScoreComponents: z.unknown(),
  sampleConfidence: z.enum(["low", "medium", "high"]),
});

export const dailyPerformanceAggregateDtoSchema = z.object({
  date: z.string(),
  pageType: z.string(),
  path: z.string(),
  contentId: z.string(),
  deviceType: z.string(),
  release: z.string(),
  totalExperiences: z.number().int().nonnegative(),
  frustratingCount: z.number().int().nonnegative(),
  brokenCount: z.number().int().nonnegative(),
  poorRate: z.number().min(0).max(1),
  sampleConfidence: z.enum(["low", "medium", "high"]),
});

export const dailyErrorAggregateDtoSchema = z.object({
  date: z.string(),
  source: z.string(),
  severity: z.string(),
  status: z.string(),
  impactArea: z.string(),
  userImpact: z.string(),
  release: z.string(),
  newGroups: z.number().int().nonnegative(),
  openGroups: z.number().int().nonnegative(),
  criticalHighGroups: z.number().int().nonnegative(),
  regressions: z.number().int().nonnegative(),
  occurrences: z.number().int().nonnegative(),
  affectedSessions: z.number().int().nonnegative(),
  blockedActionGroups: z.number().int().nonnegative(),
});

export const dailyAuditAggregateDtoSchema = z.object({
  date: z.string(),
  resourceType: z.string(),
  action: z.string(),
  outcome: z.string(),
  riskLevel: z.string(),
  publicImpact: z.boolean(),
  activityCount: z.number().int().nonnegative(),
  highCriticalCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  sensitiveActionCount: z.number().int().nonnegative(),
  activeActorCount: z.number().int().nonnegative(),
});

export const observabilityAggregatesOverviewDtoSchema = z.object({
  content: z.array(dailyContentQualityAggregateDtoSchema),
  performance: z.array(dailyPerformanceAggregateDtoSchema),
  errors: z.array(dailyErrorAggregateDtoSchema),
  audit: z.array(dailyAuditAggregateDtoSchema),
});

export type ObservabilityAggregationResultDto = z.infer<
  typeof observabilityAggregationResultDtoSchema
>;
export type ObservabilityAggregatesOverviewDto = z.infer<
  typeof observabilityAggregatesOverviewDtoSchema
>;
