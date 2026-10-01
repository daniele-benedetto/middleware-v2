import "server-only";

import { existsSync } from "node:fs";

import puppeteer from "puppeteer-core";

const DEFAULT_TIMEOUT_MS = 60_000;

function resolveChromiumExecutablePath() {
  const configuredPath =
    process.env.CHROMIUM_PATH?.trim() || process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const candidates = [
    configuredPath,
    ...(process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
      : []),
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter((candidate): candidate is string => Boolean(candidate));

  const executablePath = candidates.find((candidate) => existsSync(candidate));
  if (!executablePath) {
    throw new Error("No compatible Chromium executable was found for PDF export");
  }

  return executablePath;
}

function resolveSiteOrigin(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  return configured ? new URL(configured).origin : new URL(requestUrl).origin;
}

/**
 * Prints the same Vivliostyle-paginated page used by the CMS preview, so the PDF
 * matches what the editors approved page by page.
 */
export async function renderIssuePagesPdf({
  issueId,
  requestUrl,
  cookie,
}: {
  issueId: string;
  requestUrl: string;
  cookie: string | null;
}) {
  const browser = await puppeteer.launch({
    executablePath: resolveChromiumExecutablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

    if (cookie) {
      await page.setExtraHTTPHeaders({ cookie });
    }

    const viewerUrl = new URL(`/cms/print/${issueId}`, resolveSiteOrigin(requestUrl));
    viewerUrl.searchParams.set("render", "pdf");
    await page.goto(viewerUrl.toString(), { waitUntil: "networkidle0" });
    await page.waitForSelector('[data-print-status="ready"], [data-print-status="error"]');

    const status = await page.$eval("[data-print-status]", (element) =>
      element.getAttribute("data-print-status"),
    );
    if (status !== "ready") {
      throw new Error("Print pagination failed");
    }

    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await page.emulateMediaType("print");

    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
  }
}
