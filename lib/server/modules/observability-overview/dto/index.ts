import { z } from "zod";

import {
  observabilityInsightEntityTypeSchema,
  observabilityInsightSeveritySchema,
  observabilityInsightTypeSchema,
} from "@/lib/server/modules/observability-overview/schema";

export const observabilityInsightEntityDtoSchema = z.object({
  type: observabilityInsightEntityTypeSchema,
  id: z.string().nullable(),
  label: z.string(),
  href: z.string().nullable(),
});

export const observabilityInsightMetricDtoSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  unit: z.string().nullable(),
});

export const observabilityInsightDeepLinkDtoSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const observabilityInsightDtoSchema = z.object({
  id: z.string(),
  type: observabilityInsightTypeSchema,
  title: z.string(),
  description: z.string(),
  severity: observabilityInsightSeveritySchema,
  score: z.number().int().min(0).max(100),
  confidence: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),
  primaryEntity: observabilityInsightEntityDtoSchema,
  relatedEntities: z.array(observabilityInsightEntityDtoSchema),
  metrics: z.array(observabilityInsightMetricDtoSchema),
  deepLinks: z.array(observabilityInsightDeepLinkDtoSchema),
  dateRange: z.object({ from: z.string(), to: z.string() }),
});

export const observabilityHealthScoreDtoSchema = z.object({
  score: z.number().int().min(0).max(100),
  status: z.enum(["healthy", "watch", "degraded", "critical"]),
  confidence: z.enum(["low", "medium", "high"]),
  components: z.array(observabilityInsightMetricDtoSchema),
  penalties: z.array(observabilityInsightMetricDtoSchema),
  bonuses: z.array(observabilityInsightMetricDtoSchema),
  reasons: z.array(z.string()),
});

export const observabilityOverviewKpisDtoSchema = z.object({
  qualifiedVisits: z.number().nonnegative(),
  completedReads: z.number().nonnegative(),
  averageQualityScore: z.number().int().min(0).max(100).nullable(),
  frustratingOrBrokenExperiences: z.number().int().nonnegative(),
  criticalHighErrors: z.number().int().nonnegative(),
  errorRegressions: z.number().int().nonnegative(),
  highCriticalAuditActivities: z.number().int().nonnegative(),
  sensitiveAuditFailures: z.number().int().nonnegative(),
});

export const observabilityOverviewTrendPointDtoSchema = z.object({
  date: z.string(),
  qualifiedVisits: z.number().nonnegative(),
  completedReads: z.number().nonnegative(),
  frustratingOrBrokenExperiences: z.number().int().nonnegative(),
  criticalHighErrors: z.number().int().nonnegative(),
  highCriticalAuditActivities: z.number().int().nonnegative(),
});

export const observabilityOverviewDtoSchema = z.object({
  period: z.object({ from: z.string(), to: z.string(), days: z.number().int().positive() }),
  healthScore: observabilityHealthScoreDtoSchema,
  kpis: observabilityOverviewKpisDtoSchema,
  watchFirst: z.array(observabilityInsightDtoSchema),
  insights: z.array(observabilityInsightDtoSchema),
  trends: z.array(observabilityOverviewTrendPointDtoSchema),
  confidence: z.enum(["low", "medium", "high"]),
});

export type ObservabilityInsightDto = z.infer<typeof observabilityInsightDtoSchema>;
export type ObservabilityHealthScoreDto = z.infer<typeof observabilityHealthScoreDtoSchema>;
export type ObservabilityOverviewDto = z.infer<typeof observabilityOverviewDtoSchema>;
