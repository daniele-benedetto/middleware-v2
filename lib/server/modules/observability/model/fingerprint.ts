import { createHash } from "node:crypto";

import { observabilityDefaults } from "@/lib/server/modules/observability/model/vocabulary";

export type ErrorFingerprintFrame = {
  functionName?: string | null;
  modulePath: string;
  vendor?: boolean;
};

export type ErrorFingerprintInput = {
  errorType: string;
  message: string;
  impactArea?: string | null;
  routeTemplate?: string | null;
  method?: string | null;
  statusCode?: number | null;
  stackFrames?: ErrorFingerprintFrame[];
  fingerprintVersion?: number;
};

export type ErrorFingerprintResult = {
  fingerprint: string;
  fingerprintVersion: number;
  errorSignature: string;
  normalizedParts: string[];
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeToken(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/[^\s)]+/gi, "[url]")
    .replace(/\?.*$/g, "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/\b[0-9a-f]{24,}\b/gi, "[hex]")
    .replace(/\b\d+\b/g, "[num]")
    .toLowerCase();
}

function normalizeModulePath(value: string) {
  return normalizeToken(value)
    .replace(/^webpack:\/\//, "")
    .replace(/^file:\/\//, "")
    .replace(/:\d+:\d+$/g, "")
    .replace(/:\d+$/g, "")
    .replace(/^.*?(app|components|lib|server|pages|src)\//, "$1/");
}

function normalizeFrame(frame: ErrorFingerprintFrame) {
  return `${normalizeToken(frame.functionName || "anonymous")}@${normalizeModulePath(frame.modulePath)}`;
}

function statusClass(statusCode: number | null | undefined) {
  if (!statusCode || !Number.isFinite(statusCode)) {
    return "";
  }

  return `${Math.floor(statusCode / 100)}xx`;
}

export function createObservabilityErrorFingerprint(
  input: ErrorFingerprintInput,
): ErrorFingerprintResult {
  const fingerprintVersion = input.fingerprintVersion ?? observabilityDefaults.fingerprintVersion;
  const applicationFrames = (input.stackFrames ?? [])
    .filter((frame) => !frame.vendor && !frame.modulePath.includes("node_modules"))
    .slice(0, observabilityDefaults.maxFingerprintApplicationFrames)
    .map(normalizeFrame);
  const normalizedMessage = normalizeToken(input.message).slice(0, 500);
  const normalizedRoute = normalizeToken(input.routeTemplate);
  const normalizedParts = [
    `v${fingerprintVersion}`,
    normalizeToken(input.errorType),
    normalizedMessage,
    normalizeToken(input.method),
    normalizedRoute,
    statusClass(input.statusCode),
    ...applicationFrames,
  ];
  const errorSignature = [
    normalizeToken(input.errorType),
    normalizedMessage,
    normalizeToken(input.impactArea ?? "unknown"),
  ].join("|");

  return {
    fingerprint: sha256(normalizedParts.join("|")),
    fingerprintVersion,
    errorSignature,
    normalizedParts,
  };
}
