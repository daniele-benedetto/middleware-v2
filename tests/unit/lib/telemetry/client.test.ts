import {
  observePublicPage,
  recordAudioEngagement,
  reportClientError,
  stopTelemetryTimersForTest,
} from "@/lib/telemetry/client";

function createSessionStorage() {
  const values = new Map<string, string>();

  return {
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

function installBrowserGlobals(sendBeacon = vi.fn()) {
  const sessionStorage = createSessionStorage();
  let cookie = "";

  vi.stubGlobal("navigator", { sendBeacon, doNotTrack: "0" });
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    clearInterval: vi.fn(),
    innerHeight: 800,
    location: { origin: "https://middleware.media", pathname: "/" },
    scrollY: 0,
    sessionStorage,
    setInterval: vi.fn(() => 1),
  });
  vi.stubGlobal("document", {
    addEventListener: vi.fn(),
    documentElement: { scrollHeight: 1600 },
    hasFocus: vi.fn(() => true),
    referrer: "https://example.com",
    visibilityState: "visible",
    get cookie() {
      return cookie;
    },
    set cookie(value: string) {
      cookie = value;
    },
  });

  return { sendBeacon, sessionStorage };
}

function readBeaconPayload(sendBeacon: ReturnType<typeof vi.fn>, callIndex = 0) {
  return JSON.parse(sendBeacon.mock.calls[callIndex]?.[1] as string) as {
    sessionId: string;
    pageInstanceId: string;
    collectionMode: string;
    events: Array<{
      type: string;
      path?: string;
      message?: string;
      metadata?: Record<string, unknown>;
    }>;
  };
}

describe("observability telemetry client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    stopTelemetryTimersForTest();
  });

  it("sends session and page events in a batch", () => {
    const { sendBeacon, sessionStorage } = installBrowserGlobals();

    const cleanup = observePublicPage("/articoli/test");
    cleanup();

    expect(sendBeacon).toHaveBeenCalledWith("/api/telemetry", expect.any(String));
    const payload = readBeaconPayload(sendBeacon);

    expect(payload.sessionId).toMatch(/^obs_session_/);
    expect(payload.pageInstanceId).toMatch(/^page_/);
    expect(payload.collectionMode).toBe("full");
    expect(payload.events.map((event) => event.type)).toEqual([
      "session_start",
      "page_enter",
      "page_exit",
    ]);
    expect(payload.events[0]?.path).toBe("/articoli/test");
    expect(sessionStorage.getItem("mw_observability_session")).toContain("obs_session_");
  });

  it("does not observe technical paths", () => {
    const { sendBeacon } = installBrowserGlobals();

    observePublicPage("/cms/articles")();
    observePublicPage("/api/health")();
    observePublicPage("/_next/static/app.js")();

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("reports client errors inside the batch contract", () => {
    const { sendBeacon } = installBrowserGlobals();

    observePublicPage("/articoli/test");
    reportClientError({
      error: Object.assign(new Error("boom"), { digest: "digest-1" }),
      path: "/articoli/test",
      metadata: { component: "ArticlePage" },
    });

    const payload = readBeaconPayload(sendBeacon);
    const errorEvent = payload.events.find((event) => event.type === "client_error");

    expect(errorEvent).toMatchObject({
      type: "client_error",
      path: "/articoli/test",
      message: "boom",
    });
  });

  it("uses minimal collection mode when DNT is enabled", () => {
    const { sendBeacon } = installBrowserGlobals();
    vi.stubGlobal("navigator", { sendBeacon, doNotTrack: "1" });

    observePublicPage("/articoli/test")();

    expect(readBeaconPayload(sendBeacon).collectionMode).toBe("minimal");
  });

  it("records audio engagement inside the active page batch", () => {
    const { sendBeacon } = installBrowserGlobals();

    const cleanup = observePublicPage({
      path: "/articoli/test/ascolta",
      pageType: "listen",
      contentType: "article",
      contentId: "article-1",
      slug: "test",
    });
    recordAudioEngagement({ type: "audio_complete", listenedMs: 90_000, completionRate: 1 });
    cleanup();

    const payload = readBeaconPayload(sendBeacon);
    const audioEvent = payload.events.find((event) => event.type === "audio_complete");

    expect(audioEvent).toMatchObject({
      type: "audio_complete",
      path: "/articoli/test/ascolta",
      metadata: { listenedMs: 90_000, completionRate: 1 },
    });
  });
});
