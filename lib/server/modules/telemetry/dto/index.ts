import { z } from "zod";

import {
  engagementLevelValues,
  observabilityContentTypeValues,
  observabilityPageTypeValues,
} from "@/lib/server/modules/observability/model";
export const telemetryEngagementBreakdownItemDtoSchema = z.object({
  level: z.enum(engagementLevelValues),
  count: z.number().int().nonnegative(),
});

export const telemetryTopContentDtoSchema = z.object({
  contentId: z.string().nullable(),
  slug: z.string().nullable(),
  path: z.string(),
  pageType: z.enum(observabilityPageTypeValues),
  contentType: z.enum(observabilityContentTypeValues).nullable(),
  qualifiedVisits: z.number().int().nonnegative(),
  completedReads: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
  averageActiveTimeMs: z.number().int().nonnegative(),
  returnCountInSession: z.number().int().nonnegative(),
  refreshCount: z.number().int().nonnegative(),
  lastSeenAt: z.string(),
});

export const telemetryAudioEngagementDtoSchema = z.object({
  starts: z.number().int().nonnegative(),
  averageListenedMs: z.number().int().nonnegative(),
  averageCompletionRate: z.number().min(0).max(1),
  seekCount: z.number().int().nonnegative(),
  replayCount: z.number().int().nonnegative(),
});

export const telemetryEngagementSummaryDtoSchema = z.object({
  qualifiedVisits: z.number().int().nonnegative(),
  completedReads: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
  averageActiveTimeMs: z.number().int().nonnegative(),
  engagementBreakdown: z.array(telemetryEngagementBreakdownItemDtoSchema),
  topContent: z.array(telemetryTopContentDtoSchema),
  lowQualityContent: z.array(telemetryTopContentDtoSchema),
  sampleConfidence: z.enum(["low", "medium", "high"]),
});

export const telemetryContentEngagementListDtoSchema = z.array(telemetryTopContentDtoSchema);

export const telemetryContentEngagementDetailDtoSchema = z.object({
  contentId: z.string().nullable(),
  slug: z.string().nullable(),
  path: z.string(),
  pageType: z.enum(observabilityPageTypeValues),
  contentType: z.enum(observabilityContentTypeValues).nullable(),
  qualifiedVisits: z.number().int().nonnegative(),
  completedReads: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
  averageActiveTimeMs: z.number().int().nonnegative(),
  engagementBreakdown: z.array(telemetryEngagementBreakdownItemDtoSchema),
  maxScrollDepth: z.number().int().nonnegative(),
  scrollDistribution: z.array(
    z.object({ milestone: z.number().int(), count: z.number().int().nonnegative() }),
  ),
  returnCountInSession: z.number().int().nonnegative(),
  refreshCount: z.number().int().nonnegative(),
  exitBreakdown: z.array(z.object({ exitType: z.string(), count: z.number().int().nonnegative() })),
  audio: telemetryAudioEngagementDtoSchema.nullable(),
  sampleConfidence: z.enum(["low", "medium", "high"]),
});

export type TelemetryEngagementSummaryDto = z.infer<typeof telemetryEngagementSummaryDtoSchema>;
export type TelemetryContentEngagementDetailDto = z.infer<
  typeof telemetryContentEngagementDetailDtoSchema
>;
export type TelemetryTopContentDto = z.infer<typeof telemetryTopContentDtoSchema>;
