type ClientErrorSource = "client" | "boundary";

type ReportClientErrorInput = {
  error: Error & { digest?: string };
  source?: ClientErrorSource;
  path?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

type ClientErrorTelemetryPayload = {
  type: "client-error";
  source: ClientErrorSource;
  name?: string;
  message: string;
  digest?: string;
  path?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const telemetryEndpoint = "/api/telemetry";

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
    name: error.name || undefined,
    message: error.message || "Unknown client error",
    digest: error.digest,
    path,
    metadata,
  });
}
