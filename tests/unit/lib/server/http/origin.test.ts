import { enforceSameOrigin } from "@/lib/server/http/origin";

describe("enforceSameOrigin", () => {
  it("accepts an exact same-origin request", () => {
    const request = new Request("https://cms.example.com/api/upload", {
      headers: { origin: "https://cms.example.com" },
    });

    expect(() => enforceSameOrigin(request)).not.toThrow();
  });

  it.each([
    ["missing", undefined],
    ["cross-origin", "https://attacker.example"],
    ["different port", "https://cms.example.com:444"],
    ["invalid", "not a URL"],
    ["opaque", "null"],
  ])("rejects a %s origin", (_label, origin) => {
    const request = new Request("https://cms.example.com/api/upload", {
      headers: origin ? { origin } : undefined,
    });

    expect(() => enforceSameOrigin(request)).toThrowError(
      expect.objectContaining({ status: 403, code: "FORBIDDEN" }),
    );
  });
});
