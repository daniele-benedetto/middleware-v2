export { telemetryPolicy } from "@/lib/server/modules/telemetry/policy";
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
