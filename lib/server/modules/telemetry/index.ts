export { telemetryPolicy } from "@/lib/server/modules/telemetry/policy";
export { telemetryRepository } from "@/lib/server/modules/telemetry/repository";
export {
  analyticsTelemetryPayloadSchema,
  clientErrorTelemetryPayloadSchema,
  telemetryCollectorPayloadSchema,
  telemetryMetadataSchema,
  webVitalTelemetryPayloadSchema,
} from "@/lib/server/modules/telemetry/schema";
export { telemetryService } from "@/lib/server/modules/telemetry/service";
export type {
  AnalyticsTelemetryPayload,
  ClientErrorTelemetryPayload,
  ErrorLogSource,
  TelemetryCollectorPayload,
  TelemetryMetadata,
  WebVitalTelemetryPayload,
} from "@/lib/server/modules/telemetry/schema";
