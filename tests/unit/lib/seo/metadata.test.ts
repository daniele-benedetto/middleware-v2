import { describe, expect, it, vi } from "vitest";

import {
  buildArticleListenMetadata,
  buildArticleMetadata,
  buildPageMetadata,
  getCanonicalUrl,
} from "@/lib/seo";

describe("seo metadata", () => {
  it("builds page metadata with absolute canonical and image URLs", () => {
    const metadata = buildPageMetadata({
      title: "Archivio",
      path: "/uscite",
      openGraphImage: "/brand/custom.png",
      twitterImage: "/brand/twitter.png",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/uscite");
    expect(metadata.openGraph?.images).toEqual([
      {
        url: "http://localhost:3000/brand/custom.png",
        width: 1200,
        height: 630,
        alt: "Archivio",
      },
    ]);
    expect(metadata.twitter?.images).toEqual(["http://localhost:3000/brand/twitter.png"]);
  });

  it("builds article metadata with article fields", () => {
    const metadata = buildArticleMetadata({
      title: "Titolo articolo",
      description: "Descrizione articolo",
      slug: "titolo-articolo",
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      imageUrl: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
      authorName: "Autrice",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/articoli/titolo-articolo");
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-01-01T00:00:00.000Z",
      modifiedTime: "2026-01-02T00:00:00.000Z",
      authors: ["Autrice"],
    });
  });

  it("builds noindex listen metadata with canonical article URL and social cards", () => {
    const metadata = buildArticleListenMetadata({
      title: "Ascolta: Titolo articolo",
      description: "Descrizione audio",
      slug: "titolo-articolo",
      imageUrl: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
    });

    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/articoli/titolo-articolo");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      siteName: "middleware",
      url: "http://localhost:3000/articoli/titolo-articolo",
    });
    expect(metadata.twitter?.images).toEqual([
      "http://localhost:3000/api/public/media/blob?pathname=covers%2Fhero.jpg",
    ]);
  });

  it("uses local fallback outside production", () => {
    expect(getCanonicalUrl("/")).toBe("http://localhost:3000/");
  });
});

describe("seo production config", () => {
  it("rejects missing production site url", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    await expect(import("@/lib/seo/config")).rejects.toThrow(
      "Missing SITE_URL for production SEO metadata",
    );

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
