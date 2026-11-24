import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  RESERVED_TOP_LEVEL_SEGMENTS,
  resolvePublicContentRoute,
} from "@/lib/public/routes/public-content-route";

const appDir = path.resolve(__dirname, "../../../../../app");

function isRouteGroup(name: string) {
  return name.startsWith("(") && name.endsWith(")");
}

function isDynamicSegment(name: string) {
  return name.startsWith("[");
}

function servesIndexRoute(dir: string): boolean {
  return readdirSync(dir).some((entry) => /^(page|route)\.(t|j)sx?$/.test(entry));
}

function collectTopLevelStaticSegments(dir: string, segments = new Set<string>()) {
  for (const entry of readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    if (!statSync(entryPath).isDirectory()) continue;
    if (isRouteGroup(entry)) {
      collectTopLevelStaticSegments(entryPath, segments);
      continue;
    }
    if (!isDynamicSegment(entry) && servesIndexRoute(entryPath)) segments.add(entry);
  }
  return segments;
}

describe("resolvePublicContentRoute", () => {
  it.each([
    ["/articoli/sicurezza", { kind: "article", slug: "sicurezza", listen: false }],
    ["/articoli/sicurezza/ascolta", { kind: "article", slug: "sicurezza", listen: true }],
    ["/uscite/numero-zero", { kind: "issue", slug: "numero-zero" }],
    ["/contro-formazione/corso", { kind: "course", courseSlug: "corso" }],
    [
      "/contro-formazione/corso/lezione",
      { kind: "lesson", courseSlug: "corso", lessonSlug: "lezione", listen: false },
    ],
    [
      "/contro-formazione/corso/lezione/ascolta",
      { kind: "lesson", courseSlug: "corso", lessonSlug: "lezione", listen: true },
    ],
    ["/chi-siamo", { kind: "staticPage", slug: "chi-siamo" }],
    ["/questionari/quartiere", { kind: "questionnaire", slug: "quartiere" }],
    ["/articoli/perch%C3%A9", { kind: "article", slug: "perché", listen: false }],
  ])("maps %s to its content", (pathname, expected) => {
    expect(resolvePublicContentRoute(pathname)).toEqual(expected);
  });

  it.each([
    "/",
    "/articoli",
    "/uscite",
    "/contro-formazione",
    "/cms",
    "/api",
    "/feed.xml",
    "/manifest.webmanifest",
    "/articoli/slug/altro",
    "/contro-formazione/c/l/altro",
    "/questionari/slug/altro",
    "/questionari/slug/risultati",
    "/sconosciuto/slug",
    "/articoli/%E0%A4%A",
  ])("leaves %s to the router", (pathname) => {
    expect(resolvePublicContentRoute(pathname)).toBeNull();
  });

  it("reserves every top-level static route of the app", () => {
    const unreserved = [...collectTopLevelStaticSegments(appDir)].filter(
      (segment) => !segment.includes(".") && !RESERVED_TOP_LEVEL_SEGMENTS.has(segment),
    );

    expect(unreserved).toEqual([]);
  });
});
