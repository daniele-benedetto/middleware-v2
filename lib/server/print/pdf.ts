import "server-only";

import { existsSync } from "node:fs";

import puppeteer from "puppeteer-core";

const DEFAULT_TIMEOUT_MS = 45_000;

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

export async function renderIssuePdf({
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

    const previewUrl = new URL(`/cms/print/${issueId}`, resolveSiteOrigin(requestUrl));
    previewUrl.searchParams.set("pdf", "1");
    await page.goto(previewUrl.toString(), { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector(".print-v3-stage", { visible: true });
    await page.emulateMediaType("print");

    return await page.pdf({
      width: "210mm",
      height: "297mm",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await browser.close();
  }
}
