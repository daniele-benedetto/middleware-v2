export const observabilityRawEventTypeValues = [
  "session_start",
  "session_heartbeat",
  "session_end",
  "page_enter",
  "page_exit",
  "visibility_change",
  "scroll_milestone",
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
  "client_error",
  "server_error",
  "audit_activity",
] as const;

export const observabilityCapturedFieldValues = [
  "sessionId",
  "visitorHash",
  "type",
  "category",
  "path",
  "pageType",
  "contentId",
  "contentType",
  "requestId",
  "correlationId",
  "release",
  "sampleRate",
  "metadata",
  "clientSequence",
  "clientElapsedMs",
  "receivedAtServer",
] as const;

export const observabilityDerivedFieldValues = [
  "engagementLevel",
  "perceivedQuality",
  "completed",
  "exitType",
  "severity",
  "riskLevel",
  "publicImpact",
  "qualityScore",
] as const;

export type ObservabilityRawEventType = (typeof observabilityRawEventTypeValues)[number];
export type ObservabilityCapturedField = (typeof observabilityCapturedFieldValues)[number];
export type ObservabilityDerivedField = (typeof observabilityDerivedFieldValues)[number];

export function isRawEventType(value: string): value is ObservabilityRawEventType {
  return observabilityRawEventTypeValues.includes(value as ObservabilityRawEventType);
}

export function isDerivedField(value: string): value is ObservabilityDerivedField {
  return observabilityDerivedFieldValues.includes(value as ObservabilityDerivedField);
}
