import {
  buildCmsMediaAssetUrl,
  buildCmsMediaUploadAccept,
  buildMediaPathname,
  extractCmsMediaPathname,
  getCmsMediaAllowedContentTypes,
  inferMediaKind,
  isSupportedMediaUploadType,
  parseMediaPathname,
  resolveCmsMediaContentTypeFromExtension,
  resolveCmsMediaPreviewUrl,
  sanitizeMediaBaseName,
} from "@/lib/media/blob";

describe("media/blob helpers", () => {
  it("parses pathname parts correctly", () => {
    expect(parseMediaPathname("covers/hero-image.JPG")).toEqual({
      directory: "covers/",
      fileName: "hero-image.JPG",
      baseName: "hero-image",
      extension: ".jpg",
    });
  });

  it("sanitizes media base names", () => {
    expect(sanitizeMediaBaseName("  Caffè Hero / 2026  ")).toBe("caffe-hero-2026");
  });

  it("builds a normalized pathname", () => {
    expect(
      buildMediaPathname({
        directory: "covers/",
        baseName: "Hero Image",
        extension: "JPG",
      }),
    ).toBe("covers/hero-image.jpg");
  });

  it("infers media kind from content type and extension", () => {
    expect(inferMediaKind("covers/hero.webp", "image/webp")).toBe("image");
    expect(inferMediaKind("audio/theme.mp3", "audio/mpeg")).toBe("audio");
    expect(inferMediaKind("data/chunks.json", "application/json")).toBe("json");
    expect(inferMediaKind("misc/file.txt", "text/plain")).toBe("other");
  });

  it("validates supported upload content types", () => {
    expect(isSupportedMediaUploadType("image/png")).toBe(true);
    expect(isSupportedMediaUploadType("audio/mpeg")).toBe(true);
    expect(isSupportedMediaUploadType("application/json")).toBe(true);
    expect(isSupportedMediaUploadType("text/plain")).toBe(false);
  });

  it("builds allowed content type lists and accept string", () => {
    expect(getCmsMediaAllowedContentTypes(["image", "json"])).toEqual([
      "image/*",
      "application/json",
    ]);
    expect(buildCmsMediaUploadAccept(["audio", "json"])).toBe("audio/*,application/json");
  });

  it("resolves inferred content type from extension", () => {
    expect(resolveCmsMediaContentTypeFromExtension("covers/hero.avif")).toBe("image/avif");
    expect(resolveCmsMediaContentTypeFromExtension("data/chunks.json")).toBe("application/json");
  });

  it("extracts pathnames from blob URLs and CMS proxy URLs", () => {
    expect(
      extractCmsMediaPathname("/api/cms/media/blob?pathname=covers%2Fhero-image.jpg&download=1"),
    ).toBe("covers/hero-image.jpg");
    expect(
      extractCmsMediaPathname("https://store.blob.vercel-storage.com/covers/hero-image.jpg"),
    ).toBe("covers/hero-image.jpg");
    expect(extractCmsMediaPathname("covers/hero-image.jpg")).toBe("covers/hero-image.jpg");
    expect(extractCmsMediaPathname("https://example.com/not-a-blob-url")).toBeNull();
  });

  it("resolves preview URLs through the CMS blob route when possible", () => {
    expect(resolveCmsMediaPreviewUrl("covers/hero-image.jpg")).toBe(
      buildCmsMediaAssetUrl("covers/hero-image.jpg"),
    );
    expect(resolveCmsMediaPreviewUrl("https://example.com/plain-url")).toBe(
      "https://example.com/plain-url",
    );
  });
});
