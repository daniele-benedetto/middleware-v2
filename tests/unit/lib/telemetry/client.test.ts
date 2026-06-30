import { reportClientError } from "@/lib/telemetry/client";

function createSessionStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

describe("reportClientError", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends boundary errors with a session id when sendBeacon is available", () => {
    const sendBeacon = vi.fn();
    const sessionStorage = createSessionStorageMock();

    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("crypto", { randomUUID: () => "session-1" });

    reportClientError({
      error: Object.assign(new Error("boom"), { digest: "digest-1" }),
      path: "/articoli/test",
      metadata: { boundary: "test" },
    });

    const payload = JSON.parse(sendBeacon.mock.calls[0]?.[1] as string) as Record<string, unknown>;

    expect(sendBeacon.mock.calls[0]?.[0]).toBe("/api/telemetry");
    expect(payload).toEqual(
      expect.objectContaining({
        type: "client-error",
        source: "boundary",
        sessionId: "obs_session-1",
        name: "Error",
        message: "boom",
        digest: "digest-1",
        path: "/articoli/test",
        metadata: { boundary: "test" },
      }),
    );
    expect(payload.stack).toEqual(expect.any(String));
  });

  it("falls back to fetch keepalive", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal("navigator", {});
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
    vi.stubGlobal("crypto", { randomUUID: () => "session-1" });

    reportClientError({
      error: new Error("boom"),
      path: "/",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: expect.stringContaining('"type":"client-error"'),
      }),
    );
  });

  it("rotates the session id after inactivity", () => {
    const sendBeacon = vi.fn();
    const sessionStorage = createSessionStorageMock();
    const now = 1_000_000;

    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValueOnce("session-1").mockReturnValueOnce("session-2"),
    });
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now + 31 * 60 * 1000);

    reportClientError({ error: new Error("first"), path: "/" });
    reportClientError({ error: new Error("second"), path: "/" });

    const firstPayload = JSON.parse(sendBeacon.mock.calls[0]?.[1] as string) as {
      sessionId: string;
    };
    const secondPayload = JSON.parse(sendBeacon.mock.calls[1]?.[1] as string) as {
      sessionId: string;
    };

    expect(firstPayload.sessionId).toBe("obs_session-1");
    expect(secondPayload.sessionId).toBe("obs_session-2");
  });
});
