import { z } from "zod";

import {
  perceivedQualitySchema,
  performanceMetricNameSchema,
  performanceRatingSchema,
  sampleConfidenceSchema,
} from "@/lib/server/modules/observability-performance/schema";

export const performanceMetricSummaryDtoSchema = z.object({
  metric: performanceMetricNameSchema,
  p75: z.number().nullable(),
  rating: performanceRatingSchema,
  unit: z.enum(["ms", "unitless"]),
  goodThreshold: z.number(),
  poorThreshold: z.number(),
  sampleCount: z.number().int().nonnegative(),
});

export const performanceQualityBreakdownDtoSchema = z.object({
  quality: perceivedQualitySchema,
  count: z.number().int().nonnegative(),
});

export const performanceSummaryDtoSchema = z.object({
  totalExperiences: z.number().int().nonnegative(),
  frustratingRate: z.number().min(0).max(1),
  earlyExitCount: z.number().int().nonnegative(),
  sampleConfidence: sampleConfidenceSchema,
  qualityBreakdown: z.array(performanceQualityBreakdownDtoSchema),
  vitals: z.array(performanceMetricSummaryDtoSchema),
});

export const performanceWorstPageDtoSchema = z.object({
  path: z.string(),
  pageType: z.string(),
  contentId: z.string().nullable(),
  sampleCount: z.number().int().nonnegative(),
  affectedSessions: z.number().int().nonnegative(),
  frustratingCount: z.number().int().nonnegative(),
  frustratingRate: z.number().min(0).max(1),
  earlyExitCount: z.number().int().nonnegative(),
  earlyExitRate: z.number().min(0).max(1),
  dominantDevice: z.string().nullable(),
  release: z.string().nullable(),
  sampleConfidence: sampleConfidenceSchema,
  impactScore: z.number().int().nonnegative(),
  qualityReasons: z.array(z.string()),
  qualityBreakdown: z.array(performanceQualityBreakdownDtoSchema),
  vitals: z.array(performanceMetricSummaryDtoSchema),
});

export const performanceWorstPagesDtoSchema = z.array(performanceWorstPageDtoSchema);

export const performanceTrendPointDtoSchema = z.object({
  date: z.string(),
  p75: z.number().nullable(),
  sampleCount: z.number().int().nonnegative(),
  rating: performanceRatingSchema,
});

export const performanceTrendDtoSchema = z.object({
  metric: performanceMetricNameSchema,
  unit: z.enum(["ms", "unitless"]),
  points: z.array(performanceTrendPointDtoSchema),
});

export const performanceDetailDtoSchema = z.object({
  path: z.string(),
  pageType: z.string(),
  contentId: z.string().nullable(),
  sampleCount: z.number().int().nonnegative(),
  sampleConfidence: sampleConfidenceSchema,
  qualityBreakdown: z.array(performanceQualityBreakdownDtoSchema),
  vitals: z.array(performanceMetricSummaryDtoSchema),
  earlyExitCount: z.number().int().nonnegative(),
  correlatedErrorCount: z.number().int().nonnegative(),
  releases: z.array(z.string()),
  timeline: z.array(
    z.object({
      occurredAt: z.string(),
      sessionId: z.string().nullable(),
      pageInstanceId: z.string().nullable(),
      observabilityEventId: z.string().nullable(),
      rating: performanceRatingSchema,
      perceivedQuality: perceivedQualitySchema,
      causedEarlyExit: z.boolean(),
      qualityReasons: z.array(z.string()),
    }),
  ),
  deviceSegments: z.array(
    z.object({
      value: z.string(),
      count: z.number().int().nonnegative(),
      frustratingRate: z.number().min(0).max(1),
    }),
  ),
  connectionSegments: z.array(
    z.object({
      value: z.string(),
      count: z.number().int().nonnegative(),
      frustratingRate: z.number().min(0).max(1),
    }),
  ),
  qualityReasons: z.array(z.string()),
});

export type PerformanceSummaryDto = z.infer<typeof performanceSummaryDtoSchema>;
export type PerformanceWorstPageDto = z.infer<typeof performanceWorstPageDtoSchema>;
export type PerformanceTrendDto = z.infer<typeof performanceTrendDtoSchema>;
export type PerformanceDetailDto = z.infer<typeof performanceDetailDtoSchema>;
