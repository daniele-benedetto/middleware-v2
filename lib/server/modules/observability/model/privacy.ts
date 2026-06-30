import { createHash } from "node:crypto";

export type VisitorHashInput = {
  ipAddress?: string | null;
  userAgent?: string | null;
  date: Date;
  saltSecret: string;
};

export type PrivacySignalInput = {
  doNotTrack?: string | null;
  globalPrivacyControl?: string | null;
  consentGranted?: boolean | null;
};

export type CollectionMode = "full" | "minimal" | "disabled";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function deriveObservabilityVisitorHash(input: VisitorHashInput) {
  if (!input.saltSecret) {
    throw new Error("saltSecret is required for observability visitor hashing");
  }

  return sha256(
    `${input.ipAddress ?? ""}|${input.userAgent ?? ""}|${utcDateKey(input.date)}|${input.saltSecret}`,
  );
}

export function resolveCollectionMode(input: PrivacySignalInput): CollectionMode {
  if (input.doNotTrack === "1" || input.globalPrivacyControl === "1") {
    return "minimal";
  }

  if (input.consentGranted === false) {
    return "minimal";
  }

  return "full";
}
