import { z } from "zod";

import { observabilityPageTypeValues } from "@/lib/server/modules/observability/model";

export const performanceMetricNameValues = ["lcp", "inp", "cls", "fcp", "ttfb"] as const;
export const performanceRatingValues = ["good", "needs_improvement", "poor"] as const;
export const perceivedQualityValues = ["smooth", "acceptable", "frustrating", "broken"] as const;
export const sampleConfidenceValues = ["low", "medium", "high"] as const;

export const performanceMetricNameSchema = z.enum(performanceMetricNameValues);
export const performanceRatingSchema = z.enum(performanceRatingValues);
export const perceivedQualitySchema = z.enum(perceivedQualityValues);
export const sampleConfidenceSchema = z.enum(sampleConfidenceValues);

export const performanceMetricPayloadSchema = z.object({
  metric: performanceMetricNameSchema,
  value: z.number().finite().nonnegative(),
  metricId: z.string().trim().min(1).max(160).optional().nullable(),
  rating: performanceRatingSchema.optional().nullable(),
  routePath: z.string().trim().min(1).max(512).optional().nullable(),
  deviceType: z.string().trim().min(1).max(80).optional().nullable(),
  browser: z.string().trim().min(1).max(80).optional().nullable(),
  os: z.string().trim().min(1).max(80).optional().nullable(),
  connectionType: z.string().trim().min(1).max(80).optional().nullable(),
  effectiveConnectionType: z.string().trim().min(1).max(80).optional().nullable(),
  saveData: z.boolean().optional().nullable(),
  viewportWidth: z.number().int().positive().max(10000).optional().nullable(),
  viewportHeight: z.number().int().positive().max(10000).optional().nullable(),
  activeTimeMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000)
    .optional()
    .nullable(),
  exitType: z
    .enum(["bounce", "internal_navigation", "external_exit", "unknown"])
    .optional()
    .nullable(),
});

export const performanceQuerySchema = z.object({
  days: z.number().int().min(1).max(90).default(30),
  pageType: z.enum(observabilityPageTypeValues).optional(),
  deviceType: z.string().trim().min(1).max(80).optional(),
  perceivedQuality: perceivedQualitySchema.optional(),
  release: z.string().trim().min(1).max(120).optional(),
});

export const performanceWorstPagesQuerySchema = performanceQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  sortBy: z.enum(["impact", "lastSeenAt", "frustratingRate", "sampleCount"]).default("impact"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const performanceTrendQuerySchema = performanceQuerySchema.extend({
  metric: performanceMetricNameSchema.default("lcp"),
});

export const performanceDetailQuerySchema = performanceQuerySchema.extend({
  path: z.string().trim().min(1).max(512).startsWith("/"),
});

export type PerformanceMetricName = (typeof performanceMetricNameValues)[number];
export type PerformanceRating = (typeof performanceRatingValues)[number];
export type PerceivedQuality = (typeof perceivedQualityValues)[number];
export type SampleConfidence = (typeof sampleConfidenceValues)[number];
export type PerformanceMetricPayload = z.infer<typeof performanceMetricPayloadSchema>;
export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;
export type PerformanceWorstPagesQuery = z.infer<typeof performanceWorstPagesQuerySchema>;
export type PerformanceTrendQuery = z.infer<typeof performanceTrendQuerySchema>;
export type PerformanceDetailQuery = z.infer<typeof performanceDetailQuerySchema>;
