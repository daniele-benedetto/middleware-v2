import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CMS_NEXT_PATH_HEADER } from "@/lib/cms/redirect";
import { proxy } from "@/proxy";

const isPublicContentAvailable = vi.fn();

vi.mock("@/lib/public/server/content-availability", () => ({
  isPublicContentAvailable: (...args: unknown[]) => isPublicContentAvailable(...args),
}));

function request(pathname: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(new URL(pathname, "http://localhost:3000"), init);
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPublicContentAvailable.mockResolvedValue(true);
  });

  it("answers missing public content with a real 404", async () => {
    isPublicContentAvailable.mockResolvedValue(false);

    const response = await proxy(request("/articoli/non-esiste"));

    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://localhost:3000/non-trovato");
    expect(isPublicContentAvailable).toHaveBeenCalledWith({
      kind: "article",
      slug: "non-esiste",
      listen: false,
    });
  });

  it("lets existing public content through", async () => {
    const response = await proxy(request("/uscite/numero-zero"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("fails open when the lookup throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    isPublicContentAvailable.mockRejectedValue(new Error("db down"));

    const response = await proxy(request("/chi-siamo"));

    expect(response.status).toBe(200);
  });

  it.each([
    ["client navigation", { headers: { rsc: "1" } }],
    ["router prefetch", { headers: { "next-router-prefetch": "1" } }],
    ["server action", { method: "POST" }],
  ])("does not check %s requests", async (_label, init) => {
    isPublicContentAvailable.mockResolvedValue(false);

    const response = await proxy(request("/articoli/non-esiste", init));

    expect(response.status).toBe(200);
    expect(isPublicContentAvailable).not.toHaveBeenCalled();
  });

  it("does not check non-content paths", async () => {
    await proxy(request("/feed.xml"));
    await proxy(request("/articoli"));

    expect(isPublicContentAvailable).not.toHaveBeenCalled();
  });

  it("keeps forwarding the CMS next path", async () => {
    const response = await proxy(request("/cms/articles?page=2"));

    expect(response.headers.get(`x-middleware-request-${CMS_NEXT_PATH_HEADER}`)).toBe(
      "/cms/articles?page=2",
    );
    expect(isPublicContentAvailable).not.toHaveBeenCalled();
  });
});
