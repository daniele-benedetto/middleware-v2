type ClientErrorSource = "client" | "boundary";
type TelemetryMetadata = Record<string, string | number | boolean | null>;

type ReportClientErrorInput = {
  error: Error & { digest?: string };
  source?: ClientErrorSource;
  path?: string;
  metadata?: TelemetryMetadata;
};

type ClientErrorTelemetryPayload = {
  type: "client-error";
  source: ClientErrorSource;
  sessionId?: string;
  name?: string;
  message: string;
  digest?: string;
  stack?: string;
  path?: string;
  metadata?: TelemetryMetadata;
};

const telemetryEndpoint = "/api/telemetry";
const sessionStorageKey = "mw_observability_session";
const sessionLastSeenStorageKey = "mw_observability_session_last_seen";
const sessionTimeoutMs = 30 * 60 * 1000;

function createSessionId() {
  const randomValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `obs_${randomValue}`;
}

function readSessionId() {
  if (typeof sessionStorage === "undefined") {
    return undefined;
  }

  const now = Date.now();
  const previousSessionId = sessionStorage.getItem(sessionStorageKey);
  const previousLastSeen = Number(sessionStorage.getItem(sessionLastSeenStorageKey));
  const isExpired = !Number.isFinite(previousLastSeen) || now - previousLastSeen > sessionTimeoutMs;
  const sessionId = previousSessionId && !isExpired ? previousSessionId : createSessionId();

  sessionStorage.setItem(sessionStorageKey, sessionId);
  sessionStorage.setItem(sessionLastSeenStorageKey, String(now));

  return sessionId;
}

function sendTelemetryPayload(payload: ClientErrorTelemetryPayload) {
  const body = JSON.stringify(payload);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(telemetryEndpoint, body);
      return;
    }

    if (typeof fetch === "function") {
      void fetch(telemetryEndpoint, {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      }).catch(() => undefined);
    }
  } catch {
    // Error reporting must never break the error UI.
  }
}

function getCurrentPath() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location.pathname;
}

export function reportClientError({
  error,
  source = "boundary",
  path = getCurrentPath(),
  metadata,
}: ReportClientErrorInput) {
  sendTelemetryPayload({
    type: "client-error",
    source,
    sessionId: readSessionId(),
    name: error.name || undefined,
    message: error.message || "Unknown client error",
    digest: error.digest,
    stack: error.stack,
    path,
    metadata,
  });
}
