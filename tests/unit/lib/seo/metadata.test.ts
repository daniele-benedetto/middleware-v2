import { describe, expect, it, vi } from "vitest";

import {
  buildArticleMetadata,
  buildHomeMetadata,
  buildListenMetadata,
  buildPageMetadata,
  buildRootMetadata,
  getCanonicalUrl,
  getGeneratedSocialImageUrl,
  seoConfig,
} from "@/lib/seo";

describe("seo metadata", () => {
  it("places the page topic before the brand in title templates", () => {
    const title = buildRootMetadata().title;

    expect(title).toMatchObject({ template: "%s | Middleware" });
  });

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
        url: "http://localhost:3000/_next/image?url=%2Fbrand%2Fcustom.png&w=1200&q=75",
        alt: "Archivio",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([
      "http://localhost:3000/_next/image?url=%2Fbrand%2Ftwitter.png&w=1200&q=75",
    ]);
  });

  it("does not declare card dimensions for editorial images of unknown size", () => {
    const metadata = buildPageMetadata({
      title: "Uscita",
      path: "/uscite/numero",
      openGraphImage: "/api/public/media/blob?pathname=hero.jpg",
    });

    const images = metadata.openGraph?.images as unknown as {
      width?: number;
      height?: number;
    }[];

    expect(images).toHaveLength(1);
    expect(images[0]?.width).toBeUndefined();
    expect(images[0]?.height).toBeUndefined();
  });

  it("builds generated social image URLs for pages without images", () => {
    const metadata = buildPageMetadata({
      title: "Archivio",
      description: "Tutti i numeri pubblicati.",
      path: "/uscite",
      socialImageSection: "archivio",
      socialImageTheme: "white",
    });

    const expectedImage =
      "http://localhost:3000/api/og?title=Archivio&description=Tutti+i+numeri+pubblicati.&section=archivio&theme=white";

    expect(metadata.openGraph?.images).toEqual([
      {
        url: expectedImage,
        width: 1200,
        height: 630,
        alt: "Archivio",
      },
    ]);
    expect(metadata.twitter?.images).toEqual([expectedImage]);
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

  it("builds noindex listen metadata that stays self-canonical", () => {
    const metadata = buildListenMetadata({
      title: "Ascolta: Titolo articolo",
      description: "Descrizione audio",
      path: "/articoli/titolo-articolo/ascolta",
      imageUrl: "/api/public/media/blob?pathname=covers%2Fhero.jpg",
    });

    expect(metadata.alternates?.canonical).toBe(
      "http://localhost:3000/articoli/titolo-articolo/ascolta",
    );
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      siteName: "middleware",
      url: "http://localhost:3000/articoli/titolo-articolo/ascolta",
    });
    expect(metadata.twitter?.images).toEqual([
      "http://localhost:3000/_next/image?url=%2Fapi%2Fpublic%2Fmedia%2Fblob%3Fpathname%3Dcovers%252Fhero.jpg&w=1200&q=75",
    ]);
  });

  it("builds listen metadata with a generated card when there is no image", () => {
    const metadata = buildListenMetadata({
      title: "Ascolta l'incontro: Titolo",
      path: "/contro-formazione/corso/titolo/ascolta",
    });

    expect(metadata.alternates?.canonical).toBe(
      "http://localhost:3000/contro-formazione/corso/titolo/ascolta",
    );
    expect(metadata.twitter?.images).toEqual([
      "http://localhost:3000/api/og?title=Ascolta+l%27incontro%3A+Titolo&description=Middleware+%C3%A8+un+laboratorio+di+inchiesta+a+Modena.+Ci+occupiamo+di+territorio%2C+conflitto+sociale%2C+trasformazioni+urbane+e+contro-formazione.&section=audio&theme=red",
    ]);
  });

  it("keeps a stable brand title on the homepage", () => {
    const metadata = buildHomeMetadata({
      openGraphImage: "/api/public/media/blob?pathname=hero.jpg",
      openGraphImageAlt: "Copertina",
    });

    expect(metadata.title).toEqual({
      absolute: "Middleware | Laboratorio di inchiesta a Modena",
    });
    expect(metadata.description).toBe(seoConfig.defaultDescription);
    expect(metadata.alternates?.canonical).toBe("http://localhost:3000/");
    expect(metadata.openGraph).toMatchObject({
      title: "Middleware | Laboratorio di inchiesta a Modena",
      images: [{ alt: "Copertina" }],
    });
  });

  it("caps long descriptions in metadata and generated card URLs", () => {
    const body = "Parola ".repeat(200);
    const metadata = buildArticleMetadata({ title: "Lungo", description: body, slug: "lungo" });

    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
    expect(metadata.openGraph?.description).toBe(metadata.description);
    const ogImage = (metadata.openGraph?.images as { url: string }[])[0]?.url ?? "";
    expect(new URL(ogImage).searchParams.get("description")).toBe(metadata.description);
  });

  it("omits twitter:creator when no handle is configured", () => {
    const metadata = buildPageMetadata({ title: "Archivio", path: "/uscite" });

    expect(metadata.twitter).not.toHaveProperty("creator", expect.any(String));
  });

  it("does not emit Google-ignored keywords or a stale manifest link", () => {
    const metadata = buildRootMetadata();

    expect(metadata.keywords).toBeUndefined();
    expect(metadata.manifest).toBeUndefined();
  });

  it("builds generated social image URLs directly", () => {
    expect(
      getGeneratedSocialImageUrl({
        title: "Titolo pagina",
        description: "Descrizione pagina",
        section: "sezione",
        theme: "black",
      }),
    ).toBe(
      "http://localhost:3000/api/og?title=Titolo+pagina&description=Descrizione+pagina&section=sezione&theme=black",
    );
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
