import { describe, expect, it } from "vitest";

import { resolveRenderOrigin, toViewerCookies } from "@/lib/server/print/pdf";

describe("resolveRenderOrigin", () => {
  const request = "https://middleware.media/api/cms/print/1/pdf";

  it("uses the app on loopback in production", () => {
    expect(resolveRenderOrigin(request, { NODE_ENV: "production", PORT: "3000" })).toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("prefers an explicit render origin", () => {
    expect(
      resolveRenderOrigin(request, {
        NODE_ENV: "production",
        PRINT_RENDER_ORIGIN: "http://app:3000/ignored",
      }),
    ).toBe("http://app:3000");
  });

  it("falls back to the site URL outside production", () => {
    expect(
      resolveRenderOrigin(request, {
        NODE_ENV: "development",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      }),
    ).toBe("http://localhost:3000");
  });
});

describe("toViewerCookies", () => {
  it("scopes the request cookies to the render host only", () => {
    expect(
      toViewerCookies(
        "__Secure-better-auth.session_token=a=b; theme=dark",
        "http://127.0.0.1:3000",
      ),
    ).toEqual([
      {
        name: "__Secure-better-auth.session_token",
        value: "a=b",
        domain: "127.0.0.1",
        path: "/",
        secure: true,
      },
      { name: "theme", value: "dark", domain: "127.0.0.1", path: "/", secure: false },
    ]);
  });

  it("ignores empty or malformed cookie headers", () => {
    expect(toViewerCookies(null, "http://127.0.0.1:3000")).toEqual([]);
    expect(toViewerCookies("; =x; novalue", "http://127.0.0.1:3000")).toEqual([]);
  });
});
