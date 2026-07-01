import { z } from "zod";

import {
  observabilityMetadataSchema,
  observabilityContentTypeValues,
  observabilityPageTypeValues,
  observabilityRawEventTypeValues,
} from "@/lib/server/modules/observability/model";
import { performanceMetricPayloadSchema } from "@/lib/server/modules/observability-performance/schema";

export { observabilityMetadataSchema } from "@/lib/server/modules/observability/model";

const observabilityPathSchema = z.string().trim().min(1).max(512).startsWith("/");
const nullableTextSchema = z.string().trim().min(1).max(200).optional().nullable();
const eventTypeSchema = z.enum([
  "session_start",
  "content_interaction",
  "navigation_click",
  "audio_start",
  "audio_progress",
  "audio_complete",
  "audio_seek",
  "audio_replay",
  "media_open",
  "media_download",
  "performance_metric",
  "session_heartbeat",
  "session_end",
  "page_enter",
  "page_exit",
  "visibility_change",
  "scroll_milestone",
  "client_error",
]);

const baseCollectorEventSchema = z.object({
  type: eventTypeSchema,
  path: observabilityPathSchema.optional().nullable(),
  pageType: z.enum(observabilityPageTypeValues).optional().nullable(),
  contentId: z.string().trim().min(1).max(120).optional().nullable(),
  contentType: z.enum(observabilityContentTypeValues).optional().nullable(),
  sampleRate: z.number().finite().positive().max(1).default(1),
  clientSequence: z.number().int().nonnegative(),
  clientElapsedMs: z
    .number()
    .int()
    .nonnegative()
    .max(24 * 60 * 60 * 1000),
  metadata: observabilityMetadataSchema.optional(),
});

export const telemetryCollectorEventSchema = baseCollectorEventSchema
  .extend({
    source: z.enum(["client", "boundary"]).optional().nullable(),
    name: z.string().trim().min(1).max(120).optional().nullable(),
    message: z.string().trim().min(1).max(1000).optional().nullable(),
    digest: z.string().trim().min(1).max(160).optional().nullable(),
    stack: z.string().trim().min(1).max(8000).optional().nullable(),
    requestId: nullableTextSchema,
    correlationId: nullableTextSchema,
    release: z.string().trim().min(1).max(120).optional().nullable(),
  })
  .superRefine((event, context) => {
    if (event.type !== "performance_metric") {
      return;
    }

    const parsedMetric = performanceMetricPayloadSchema.safeParse(event.metadata);

    if (!parsedMetric.success) {
      context.addIssue({
        code: "custom",
        message: "Performance events require valid performance metadata",
        path: ["metadata"],
      });
    }
  });

export const telemetryCollectorPayloadSchema = z
  .object({
    sessionId: z.string().trim().min(16).max(120),
    pageInstanceId: z.string().trim().min(8).max(120),
    collectionMode: z.enum(["full", "minimal"]),
    referrer: z.string().trim().min(1).max(512).optional().nullable(),
    events: z.array(telemetryCollectorEventSchema).min(1).max(50),
  })
  .superRefine((payload, context) => {
    if (payload.collectionMode !== "minimal") {
      return;
    }

    payload.events.forEach((event, index) => {
      if (
        event.type === "session_heartbeat" ||
        event.type === "scroll_milestone" ||
        event.type === "performance_metric"
      ) {
        context.addIssue({
          code: "custom",
          message: "Minimal collection mode cannot include behavioral or performance events",
          path: ["events", index, "type"],
        });
      }
    });
  });

export const telemetryEngagementQuerySchema = z.object({
  days: z.number().int().min(1).max(90).default(30),
  pageType: z.enum(observabilityPageTypeValues).optional(),
  contentType: z.enum(observabilityContentTypeValues).optional(),
});

export const listContentEngagementQuerySchema = telemetryEngagementQuerySchema.extend({
  q: z.string().trim().min(1).optional(),
  sortBy: z
    .enum([
      "lastSeenAt",
      "qualifiedVisits",
      "completedReads",
      "completionRate",
      "averageActiveTimeMs",
    ])
    .default("qualifiedVisits"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const contentEngagementDetailQuerySchema = telemetryEngagementQuerySchema.extend({
  contentId: z.string().trim().min(1).max(120).optional().nullable(),
  path: observabilityPathSchema.optional().nullable(),
});

export type TelemetryCollectorEvent = z.infer<typeof telemetryCollectorEventSchema>;
export type TelemetryEngagementQuery = z.infer<typeof telemetryEngagementQuerySchema>;
export type ListContentEngagementQuery = z.infer<typeof listContentEngagementQuerySchema>;
export type ContentEngagementDetailQuery = z.infer<typeof contentEngagementDetailQuerySchema>;
export type TelemetryCollectorPayload = z.infer<typeof telemetryCollectorPayloadSchema>;
export type ObservabilityRawEventType = (typeof observabilityRawEventTypeValues)[number];
export type ObservabilityMetadata = z.infer<typeof observabilityMetadataSchema>;
