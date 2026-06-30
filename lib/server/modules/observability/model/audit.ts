import type {
  AuditOutcome,
  AuditRiskLevel,
  ObservabilityContentType,
} from "@/lib/server/modules/observability/model/vocabulary";

export type AuditRiskInput = {
  action: string;
  resourceType: ObservabilityContentType;
  outcome: AuditOutcome;
  isPublishedResource?: boolean;
  isFeaturedResource?: boolean;
  isPublicNavigation?: boolean;
  isPublicMedia?: boolean;
};

const criticalActionPattern = /(role|permission|admin|security|delete_user|mass_delete)/i;
const highActionPattern = /(publish|unpublish|delete|upload|remove)/i;

export function deriveAuditPublicImpact(input: AuditRiskInput) {
  return Boolean(
    input.isPublishedResource ||
    input.isFeaturedResource ||
    input.isPublicNavigation ||
    input.isPublicMedia ||
    (input.resourceType === "navigation" && input.isPublicNavigation),
  );
}

export function deriveAuditRiskLevel(input: AuditRiskInput): AuditRiskLevel {
  if (criticalActionPattern.test(input.action) || input.resourceType === "user") {
    return "critical";
  }

  if (highActionPattern.test(input.action) && deriveAuditPublicImpact(input)) {
    return "high";
  }

  if (deriveAuditPublicImpact(input)) {
    return "medium";
  }

  if (highActionPattern.test(input.action)) {
    return "medium";
  }

  return "low";
}
