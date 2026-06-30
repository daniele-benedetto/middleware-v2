type ClientErrorSource = "client" | "boundary";
type TelemetryMetadata = Record<string, string | number | boolean | null>;

type AnalyticsEvent = "page_view" | "article_view" | "issue_view" | "listen_view" | "media_open";
type WebVitalName = "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
type WebVitalRating = "good" | "needs-improvement" | "poor";

type ReportClientErrorInput = {
  error: Error & { digest?: string };
  source?: ClientErrorSource;
  path?: string;
  metadata?: TelemetryMetadata;
};

type TrackInput = {
  event: AnalyticsEvent;
  path?: string;
  referrer?: string | null;
  metadata?: TelemetryMetadata;
};

type WebVitalMetricInput = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating?: string;
  navigationType?: string;
};

type ClientErrorTelemetryPayload = {
  type: "client-error";
  source: ClientErrorSource;
  name?: string;
  message: string;
  digest?: string;
  path?: string;
  metadata?: TelemetryMetadata;
};

type AnalyticsTelemetryPayload = {
  type: "analytics";
  event: AnalyticsEvent;
  path: string;
  referrer?: string | null;
  metadata?: TelemetryMetadata;
};

type WebVitalTelemetryPayload = {
  type: "web-vital";
  metricId: string;
  name: WebVitalName;
  value: number;
  delta: number;
  rating?: WebVitalRating | null;
  navigationType?: string | null;
  path: string;
};

type TelemetryPayload =
  | AnalyticsTelemetryPayload
  | WebVitalTelemetryPayload
  | ClientErrorTelemetryPayload;

const telemetryEndpoint = "/api/telemetry";
const technicalPathPrefixes = ["/_next", "/api", "/cms"] as const;
const webVitalNames = new Set<string>(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]);
const webVitalRatings = new Set<string>(["good", "needs-improvement", "poor"]);

function sendTelemetryPayload(payload: TelemetryPayload) {
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

function getCurrentReferrer() {
  if (typeof document === "undefined") {
    return null;
  }

  return document.referrer || null;
}

function shouldSkipPath(path: string | undefined) {
  if (!path) {
    return true;
  }

  return technicalPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function readWebVitalName(value: string): WebVitalName | null {
  return webVitalNames.has(value) ? (value as WebVitalName) : null;
}

function readWebVitalRating(value: string | undefined): WebVitalRating | null {
  return value && webVitalRatings.has(value) ? (value as WebVitalRating) : null;
}

export function track({
  event,
  path = getCurrentPath(),
  referrer = getCurrentReferrer(),
  metadata,
}: TrackInput) {
  if (!path || shouldSkipPath(path)) {
    return;
  }

  const resolvedPath = path;

  sendTelemetryPayload({
    type: "analytics",
    event,
    path: resolvedPath,
    referrer,
    metadata,
  });
}

export function reportWebVital(metric: WebVitalMetricInput, path = getCurrentPath()) {
  const name = readWebVitalName(metric.name);

  if (!name || !path || shouldSkipPath(path)) {
    return;
  }

  const resolvedPath = path;

  sendTelemetryPayload({
    type: "web-vital",
    metricId: metric.id,
    name,
    value: metric.value,
    delta: metric.delta,
    rating: readWebVitalRating(metric.rating),
    navigationType: metric.navigationType ?? null,
    path: resolvedPath,
  });
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
