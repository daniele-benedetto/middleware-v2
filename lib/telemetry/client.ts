type TelemetryMetadata = Record<string, string | number | boolean | null>;
type CollectionMode = "full" | "minimal";
type ClientErrorSource = "client" | "boundary";

type TelemetryEvent = {
  type:
    | "session_start"
    | "session_heartbeat"
    | "session_end"
    | "page_enter"
    | "page_exit"
    | "visibility_change"
    | "scroll_milestone"
    | "content_interaction"
    | "navigation_click"
    | "audio_start"
    | "audio_progress"
    | "audio_complete"
    | "audio_seek"
    | "audio_replay"
    | "media_open"
    | "media_download"
    | "performance_metric"
    | "client_error";
  path?: string | null;
  pageType?: string | null;
  contentId?: string | null;
  contentType?: string | null;
  source?: ClientErrorSource | null;
  name?: string | null;
  message?: string | null;
  digest?: string | null;
  stack?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  release?: string | null;
  sampleRate: number;
  clientSequence: number;
  clientElapsedMs: number;
  metadata?: TelemetryMetadata;
};

type TelemetryBatch = {
  sessionId: string;
  pageInstanceId: string;
  collectionMode: CollectionMode;
  referrer?: string | null;
  events: TelemetryEvent[];
};

type PageObservation = {
  path: string;
  pageType?: string | null;
  contentId?: string | null;
  contentType?: string | null;
  slug?: string | null;
  pageInstanceId: string;
  sentScrollMilestones: Set<number>;
  exited: boolean;
};

type ObservePublicPageInput = {
  path?: string | null;
  pageType?: string | null;
  contentId?: string | null;
  contentType?: string | null;
  slug?: string | null;
};

type ReportClientErrorInput = {
  error: Error & { digest?: string };
  source?: ClientErrorSource;
  path?: string;
  metadata?: TelemetryMetadata;
};

type AudioEngagementInput = {
  type: "audio_start" | "audio_progress" | "audio_complete" | "audio_seek" | "audio_replay";
  listenedMs?: number;
  completionRate?: number;
  metadata?: TelemetryMetadata;
};

type PerformanceMetricName = "lcp" | "inp" | "cls" | "fcp" | "ttfb";

type ReportPerformanceMetricInput = {
  metric: PerformanceMetricName;
  value: number;
  metricId?: string | null;
  metadata?: TelemetryMetadata;
};

const telemetryEndpoint = "/api/telemetry";
const sessionStorageKey = "mw_observability_session";
const sessionTimeoutMs = 30 * 60 * 1000;
const heartbeatIntervalMs = 15 * 1000;
const idleThresholdMs = 30 * 1000;
const flushIntervalMs = 7 * 1000;
const maxBatchEvents = 20;
const technicalPathPrefixes = ["/_next", "/api", "/cms"] as const;
const technicalPaths = new Set(["/favicon.ico", "/robots.txt", "/sitemap.xml"]);

let sessionId: string | null = null;
let sequence = 0;
let buffer: TelemetryEvent[] = [];
let currentPage: PageObservation | null = null;
let started = false;
let focused = true;
let lastInteractionAt = 0;
let heartbeatTimer: number | null = null;
let flushTimer: number | null = null;
let listenersInstalled = false;
let interactionCount = 0;
let performanceObserversInstalled = false;
let cumulativeLayoutShift = 0;

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function randomId(prefix: string) {
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${prefix}_${value}`;
}

function normalizePath(path: string | undefined) {
  if (!path) {
    return null;
  }

  try {
    return new URL(path, window.location.origin).pathname || "/";
  } catch {
    return "/";
  }
}

function getCurrentPath() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizePath(window.location.pathname);
}

function shouldSkipPath(path: string | null | undefined) {
  if (!path) {
    return true;
  }

  return (
    technicalPaths.has(path) ||
    technicalPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

function inferPageType(path: string | null) {
  if (!path || path === "/") {
    return "home";
  }

  if (path.startsWith("/articoli/")) {
    return "article";
  }

  if (path.startsWith("/uscite")) {
    return "issue";
  }

  if (path.startsWith("/ascolta")) {
    return "listen";
  }

  if (path.startsWith("/media")) {
    return "media";
  }

  return "static_page";
}

function readConsentChoice() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("mw_cookie_consent="));

  if (!cookie) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("="))) as {
      choice?: string;
      expiresAt?: string;
    };

    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return parsed.choice ?? null;
  } catch {
    return null;
  }
}

function resolveCollectionMode(): CollectionMode {
  if (typeof navigator !== "undefined") {
    const globalPrivacyControl = (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl;

    if (navigator.doNotTrack === "1" || globalPrivacyControl === true) {
      return "minimal";
    }
  }

  return readConsentChoice() === "rejected" ? "minimal" : "full";
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(sessionStorageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { id?: string; lastActivityAt?: number; sequence?: number };
    if (
      !parsed.id ||
      !parsed.lastActivityAt ||
      Date.now() - parsed.lastActivityAt > sessionTimeoutMs
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistSession() {
  if (typeof window === "undefined" || !sessionId) {
    return;
  }

  window.sessionStorage.setItem(
    sessionStorageKey,
    JSON.stringify({ id: sessionId, lastActivityAt: Date.now(), sequence }),
  );
}

function ensureSession() {
  const stored = readStoredSession();

  sessionId = stored?.id ?? randomId("obs_session");
  sequence = stored?.sequence ?? 0;
  persistSession();
  return sessionId;
}

function nextSequence() {
  sequence += 1;
  persistSession();
  return sequence;
}

function isActive() {
  if (resolveCollectionMode() !== "full") {
    return false;
  }

  return (
    typeof document !== "undefined" &&
    document.visibilityState === "visible" &&
    focused &&
    now() - lastInteractionAt <= idleThresholdMs
  );
}

function enqueue(
  event: Omit<TelemetryEvent, "sampleRate" | "clientSequence" | "clientElapsedMs"> & {
    sampleRate?: number;
  },
) {
  const path = normalizePath(event.path ?? currentPage?.path ?? getCurrentPath() ?? undefined);

  if (shouldSkipPath(path)) {
    return;
  }

  const collectionMode = resolveCollectionMode();

  if (
    collectionMode === "minimal" &&
    (event.type === "session_heartbeat" || event.type === "scroll_milestone")
  ) {
    return;
  }

  buffer.push({
    ...event,
    path,
    pageType: event.pageType ?? currentPage?.pageType ?? inferPageType(path),
    contentId: event.contentId ?? currentPage?.contentId,
    contentType: event.contentType ?? currentPage?.contentType,
    sampleRate: event.sampleRate ?? 1,
    clientSequence: nextSequence(),
    clientElapsedMs: Math.max(0, Math.round(now())),
  });

  if (buffer.length >= maxBatchEvents) {
    flush();
  }
}

function readConnectionMetadata(): TelemetryMetadata {
  if (typeof navigator === "undefined") {
    return {};
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        type?: string;
        effectiveType?: string;
        saveData?: boolean;
      };
    }
  ).connection;

  return {
    connectionType: connection?.type ?? null,
    effectiveConnectionType: connection?.effectiveType ?? null,
    saveData: connection?.saveData ?? null,
  };
}

function readViewportMetadata(): TelemetryMetadata {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

export function reportPerformanceMetric({
  metric,
  value,
  metricId,
  metadata,
}: ReportPerformanceMetricInput) {
  if (resolveCollectionMode() !== "full" || !Number.isFinite(value) || value < 0) {
    return;
  }

  enqueue({
    type: "performance_metric",
    sampleRate: 1,
    metadata: {
      ...readConnectionMetadata(),
      ...readViewportMetadata(),
      ...(metadata ?? {}),
      metric,
      value: metric === "cls" ? value : Math.round(value),
      metricId: metricId ?? null,
    },
  });
}

function observePerformanceEntryTypes(
  types: string[],
  callback: (entry: PerformanceEntry) => void,
) {
  if (typeof PerformanceObserver === "undefined") {
    return;
  }

  for (const type of types) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) callback(entry);
      });
      observer.observe({ type, buffered: true });
    } catch {
      // Unsupported entry types vary by browser; unsupported metrics are simply absent.
    }
  }
}

function installPerformanceObservers() {
  if (performanceObserversInstalled || typeof window === "undefined") {
    return;
  }

  performanceObserversInstalled = true;

  // Native observers keep the collector dependency-free; unsupported metrics stay absent.
  observePerformanceEntryTypes(["paint"], (entry) => {
    if (entry.name === "first-contentful-paint") {
      reportPerformanceMetric({ metric: "fcp", value: entry.startTime, metricId: entry.name });
    }
  });

  observePerformanceEntryTypes(["largest-contentful-paint"], (entry) => {
    reportPerformanceMetric({ metric: "lcp", value: entry.startTime, metricId: entry.name });
  });

  observePerformanceEntryTypes(["layout-shift"], (entry) => {
    const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
    if (!layoutShift.hadRecentInput && typeof layoutShift.value === "number") {
      cumulativeLayoutShift += layoutShift.value;
      reportPerformanceMetric({
        metric: "cls",
        value: cumulativeLayoutShift,
        metricId: entry.name,
      });
    }
  });

  observePerformanceEntryTypes(["event"], (entry) => {
    const eventEntry = entry as PerformanceEntry & { interactionId?: number; duration?: number };
    if (eventEntry.interactionId && typeof eventEntry.duration === "number") {
      reportPerformanceMetric({ metric: "inp", value: eventEntry.duration, metricId: entry.name });
    }
  });

  window.setTimeout(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | (PerformanceNavigationTiming & { responseStart?: number; requestStart?: number })
      | undefined;
    const ttfb = navigationEntry
      ? navigationEntry.responseStart - navigationEntry.requestStart
      : performance.timing.responseStart - performance.timing.requestStart;

    reportPerformanceMetric({ metric: "ttfb", value: Math.max(0, ttfb), metricId: "navigation" });
  }, 0);
}

function sendBatch(batch: TelemetryBatch) {
  const body = JSON.stringify(batch);

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
    // Telemetry must never affect the page.
  }
}

function flush() {
  if (!sessionId || !currentPage || buffer.length === 0) {
    return;
  }

  const events = buffer;
  buffer = [];

  sendBatch({
    sessionId,
    pageInstanceId: currentPage.pageInstanceId,
    collectionMode: resolveCollectionMode(),
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    events,
  });
}

function handleInteraction() {
  lastInteractionAt = now();
  interactionCount += 1;
  persistSession();
}

function recordPageExit() {
  if (!currentPage || currentPage.exited) {
    return;
  }

  currentPage.exited = true;
  enqueue({ type: "page_exit", path: currentPage.path });
}

function handleVisibilityChange() {
  enqueue({
    type: "visibility_change",
    metadata: { visibilityState: document.visibilityState },
  });

  if (document.visibilityState === "hidden") {
    recordPageExit();
    flush();
  }
}

function handleScroll() {
  if (!currentPage || resolveCollectionMode() !== "full") {
    return;
  }

  handleInteraction();

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const depth = scrollable <= 0 ? 100 : Math.round((window.scrollY / scrollable) * 100);
  const milestone = [25, 50, 75, 90, 100].find(
    (value) => depth >= value && !currentPage?.sentScrollMilestones.has(value),
  );

  if (!milestone) {
    return;
  }

  currentPage.sentScrollMilestones.add(milestone);
  enqueue({ type: "scroll_milestone", metadata: { milestone }, sampleRate: 0.5 });
}

function installListeners() {
  if (listenersInstalled || typeof window === "undefined") {
    return;
  }

  listenersInstalled = true;
  focused = document.hasFocus();
  lastInteractionAt = now();

  window.addEventListener("focus", () => {
    focused = true;
    handleInteraction();
  });
  window.addEventListener("blur", () => {
    focused = false;
  });
  window.addEventListener("pointerdown", handleInteraction, { passive: true });
  window.addEventListener("keydown", handleInteraction);
  window.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("a") : null;
      const href = target?.getAttribute("href");

      if (href?.startsWith("/") && currentPage) {
        enqueue({ type: "navigation_click", metadata: { href: href.slice(0, 500) } });
      }
    },
    { passive: true },
  );
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", () => {
    recordPageExit();
    enqueue({ type: "session_end", path: currentPage?.path });
    flush();
  });

  heartbeatTimer = window.setInterval(() => {
    if (isActive()) {
      enqueue({ type: "session_heartbeat", metadata: { interactionCount }, sampleRate: 0.5 });
    }
  }, heartbeatIntervalMs);

  flushTimer = window.setInterval(flush, flushIntervalMs);
}

export function observePublicPage(input: ObservePublicPageInput | string | null | undefined) {
  const pageInput = typeof input === "string" || input == null ? { path: input } : input;
  const normalizedPath = normalizePath(pageInput.path ?? undefined);

  if (shouldSkipPath(normalizedPath)) {
    return () => undefined;
  }

  ensureSession();
  installListeners();
  installPerformanceObservers();
  recordPageExit();

  currentPage = {
    path: normalizedPath ?? "/",
    pageType: pageInput.pageType ?? inferPageType(normalizedPath),
    contentId: pageInput.contentId ?? null,
    contentType: pageInput.contentType ?? null,
    slug: pageInput.slug ?? null,
    pageInstanceId: randomId("page"),
    sentScrollMilestones: new Set<number>(),
    exited: false,
  };

  if (!started) {
    started = true;
    enqueue({ type: "session_start", path: currentPage.path });
  }

  enqueue({
    type: "page_enter",
    path: currentPage.path,
    metadata: { slug: currentPage.slug ?? null },
  });

  return () => {
    recordPageExit();
    flush();
  };
}

export function reportClientError({
  error,
  source = "boundary",
  path = getCurrentPath() ?? undefined,
  metadata,
}: ReportClientErrorInput) {
  ensureSession();

  if (!currentPage) {
    const normalizedPath = normalizePath(path);
    currentPage = {
      path: normalizedPath ?? "/",
      pageType: inferPageType(normalizedPath),
      contentId: null,
      contentType: null,
      slug: null,
      pageInstanceId: randomId("page"),
      sentScrollMilestones: new Set<number>(),
      exited: false,
    };
  }

  enqueue({
    type: "client_error",
    source,
    name: error.name || undefined,
    message: error.message || "Unknown client error",
    digest: error.digest,
    stack: error.stack,
    path,
    metadata,
  });
  flush();
}

export function recordContentInteraction(metadata?: TelemetryMetadata) {
  handleInteraction();
  enqueue({ type: "content_interaction", metadata });
}

export function recordMediaEngagement(
  type: "media_open" | "media_download",
  metadata?: TelemetryMetadata,
) {
  handleInteraction();
  enqueue({ type, metadata });
}

export function recordAudioEngagement({
  type,
  listenedMs,
  completionRate,
  metadata,
}: AudioEngagementInput) {
  handleInteraction();
  enqueue({
    type,
    metadata: {
      ...(metadata ?? {}),
      listenedMs: typeof listenedMs === "number" ? Math.max(0, Math.round(listenedMs)) : null,
      completionRate:
        typeof completionRate === "number" ? Math.max(0, Math.min(1, completionRate)) : null,
    },
  });
}

export function stopTelemetryTimersForTest() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (flushTimer) {
    window.clearInterval(flushTimer);
    flushTimer = null;
  }
  interactionCount = 0;

  sessionId = null;
  sequence = 0;
  buffer = [];
  currentPage = null;
  started = false;
  listenersInstalled = false;
  performanceObserversInstalled = false;
  cumulativeLayoutShift = 0;
}
