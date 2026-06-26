import { getRequestId } from "@/lib/server/http/request";

describe("request helpers", () => {
  it("uses platform request identifiers when present", () => {
    const request = new Request("https://example.com/api", {
      headers: { "x-vercel-id": "iad1::abc-123" },
    });

    expect(getRequestId(request)).toBe("iad1::abc-123");
  });

  it("generates a stable request identifier when no header exists", () => {
    const request = new Request("https://example.com/api");
    const first = getRequestId(request);
    const second = getRequestId(request);

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second).toBe(first);
  });
});
