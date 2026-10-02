import { printFormats, type PrintFormat } from "@/lib/print/format";

import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Serializes the rendered print source as a standalone document for the
 * paginator, with absolute resource URLs so it does not depend on the host page.
 */
export function serializePrintSource(
  source: HTMLElement,
  variant: IssueHomeVariant,
  format: PrintFormat,
  origin: string,
) {
  const clone = source.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("img[src]").forEach((image) => {
    image.setAttribute("src", new URL(image.getAttribute("src") ?? "", origin).href);
  });

  const stylesheets = printFormats[format].stylesheets
    .map((path) => `<link rel="stylesheet" href="${escapeAttribute(new URL(path, origin).href)}">`)
    .join("");

  return [
    "<!doctype html>",
    `<html lang="it" data-variant="${variant}" data-format="${format}">`,
    `<head><meta charset="utf-8">${stylesheets}</head>`,
    `<body>${clone.innerHTML}</body>`,
    "</html>",
  ].join("");
}
