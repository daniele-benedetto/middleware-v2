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
  pageInstanceId: string;
  sentScrollMilestones: Set<number>;
  exited: boolean;
};

type ReportClientErrorInput = {
  error: Error & { digest?: string };
  source?: ClientErrorSource;
  path?: string;
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
    pageType: event.pageType ?? inferPageType(path),
    sampleRate: event.sampleRate ?? 1,
    clientSequence: nextSequence(),
    clientElapsedMs: Math.max(0, Math.round(now())),
  });

  if (buffer.length >= maxBatchEvents) {
    flush();
  }
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
  enqueue({ type: "scroll_milestone", metadata: { milestone } });
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
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", () => {
    recordPageExit();
    enqueue({ type: "session_end", path: currentPage?.path });
    flush();
  });

  heartbeatTimer = window.setInterval(() => {
    if (isActive()) {
      enqueue({ type: "session_heartbeat", metadata: { interactionCount: 1 } });
    }
  }, heartbeatIntervalMs);

  flushTimer = window.setInterval(flush, flushIntervalMs);
}

export function observePublicPage(path: string | null | undefined) {
  const normalizedPath = normalizePath(path ?? undefined);

  if (shouldSkipPath(normalizedPath)) {
    return () => undefined;
  }

  ensureSession();
  installListeners();
  recordPageExit();

  currentPage = {
    path: normalizedPath ?? "/",
    pageInstanceId: randomId("page"),
    sentScrollMilestones: new Set<number>(),
    exited: false,
  };

  if (!started) {
    started = true;
    enqueue({ type: "session_start", path: currentPage.path });
  }

  enqueue({ type: "page_enter", path: currentPage.path });

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

export function stopTelemetryTimersForTest() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (flushTimer) {
    window.clearInterval(flushTimer);
    flushTimer = null;
  }

  sessionId = null;
  sequence = 0;
  buffer = [];
  currentPage = null;
  started = false;
  listenersInstalled = false;
}
