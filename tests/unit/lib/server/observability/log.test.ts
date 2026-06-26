import { logServerEvent } from "@/lib/server/observability/log";

describe("logServerEvent", () => {
  it("writes structured error logs", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logServerEvent({
      event: "TEST_EVENT",
      level: "error",
      requestId: "request-1",
      path: "/api/test",
      method: "POST",
      error: new Error("boom"),
    });

    const payload = JSON.parse(String(spy.mock.calls[0]?.[0])) as {
      event: string;
      level: string;
      requestId: string;
      error: { message: string };
    };

    expect(payload).toMatchObject({
      event: "TEST_EVENT",
      level: "error",
      requestId: "request-1",
    });
    expect(payload.error.message).toBe("boom");

    spy.mockRestore();
  });
});
