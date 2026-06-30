import { z } from "zod";

export const observabilityPageTypeValues = [
  "home",
  "article",
  "issue",
  "static_page",
  "listen",
  "media",
  "cms",
] as const;

export const observabilityContentTypeValues = [
  "article",
  "issue",
  "page",
  "media",
  "navigation",
  "user",
  "taxonomy",
] as const;

export const engagementLevelValues = ["glance", "scan", "engaged", "completed"] as const;
export const perceivedQualityValues = ["smooth", "acceptable", "frustrating", "broken"] as const;
export const errorSeverityValues = ["low", "medium", "high", "critical"] as const;
export const errorStatusValues = ["open", "investigating", "resolved", "ignored"] as const;
export const auditRiskLevelValues = ["low", "medium", "high", "critical"] as const;
export const auditOutcomeValues = ["SUCCESS", "FAILURE"] as const;
export const referrerTypeValues = [
  "direct",
  "internal",
  "search",
  "social",
  "external",
  "campaign",
] as const;

export const observabilityPageTypeSchema = z.enum(observabilityPageTypeValues);
export const observabilityContentTypeSchema = z.enum(observabilityContentTypeValues);
export const engagementLevelSchema = z.enum(engagementLevelValues);
export const perceivedQualitySchema = z.enum(perceivedQualityValues);
export const errorSeveritySchema = z.enum(errorSeverityValues);
export const errorStatusSchema = z.enum(errorStatusValues);
export const auditRiskLevelSchema = z.enum(auditRiskLevelValues);
export const auditOutcomeSchema = z.enum(auditOutcomeValues);
export const referrerTypeSchema = z.enum(referrerTypeValues);

export type ObservabilityPageType = (typeof observabilityPageTypeValues)[number];
export type ObservabilityContentType = (typeof observabilityContentTypeValues)[number];
export type EngagementLevel = (typeof engagementLevelValues)[number];
export type PerceivedQuality = (typeof perceivedQualityValues)[number];
export type ErrorSeverity = (typeof errorSeverityValues)[number];
export type ErrorStatus = (typeof errorStatusValues)[number];
export type AuditRiskLevel = (typeof auditRiskLevelValues)[number];
export type AuditOutcome = (typeof auditOutcomeValues)[number];
export type ReferrerType = (typeof referrerTypeValues)[number];

export const observabilityDefaults = {
  sessionInactivityTimeoutMs: 30 * 60 * 1000,
  heartbeatIntervalMs: 15 * 1000,
  activeTimeIdleThresholdMs: 30 * 1000,
  activeTimeMaxHeartbeatGapMs: 20 * 1000,
  fingerprintVersion: 1,
  maxFingerprintApplicationFrames: 5,
  defaultSampleRate: 1,
} as const;
