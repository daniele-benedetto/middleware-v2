import "server-only";

import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import puppeteer, { type CookieData } from "puppeteer-core";

import type { PrintFormat } from "@/lib/print/format";

// Same budget as the viewer's own pagination timeout.
const DEFAULT_TIMEOUT_MS = 180_000;

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

/** Request cookies, re-scoped to the site so third-party requests (map tiles, media) never carry them. */
export function toViewerCookies(cookieHeader: string | null, origin: string): CookieData[] {
  if (!cookieHeader) return [];

  const { hostname, protocol } = new URL(origin);
  return cookieHeader.split(";").flatMap((pair) => {
    const separator = pair.indexOf("=");
    const name = pair.slice(0, Math.max(separator, 0)).trim();
    if (!name) return [];

    return [
      {
        name,
        value: pair.slice(separator + 1).trim(),
        domain: hostname,
        path: "/",
        secure: protocol === "https:" || name.startsWith("__Secure-") || name.startsWith("__Host-"),
      },
    ];
  });
}

/**
 * Where headless Chromium opens the viewer. In production it is the app itself
 * on loopback, so the render does not depend on DNS, the reverse proxy or the
 * public network; `PRINT_RENDER_ORIGIN` overrides it.
 */
export function resolveRenderOrigin(requestUrl: string, env: NodeJS.ProcessEnv = process.env) {
  const configured = env.PRINT_RENDER_ORIGIN?.trim();
  if (configured) return new URL(configured).origin;
  if (env.NODE_ENV === "production") return `http://127.0.0.1:${env.PORT?.trim() || "3000"}`;

  const site = env.NEXT_PUBLIC_SITE_URL?.trim() || env.SITE_URL?.trim();
  return site ? new URL(site).origin : new URL(requestUrl).origin;
}

function resolveTimeoutMs(env: NodeJS.ProcessEnv = process.env) {
  const configured = Number(env.PRINT_PDF_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS;
}

async function step<T>(name: string, run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    throw new Error(`PDF render failed at "${name}"`, { cause: error });
  }
}

/**
 * Prints the same Vivliostyle-paginated page used by the CMS preview, so the PDF
 * matches what the editors approved page by page.
 */
export async function renderIssuePagesPdf({
  issueId,
  format,
  requestUrl,
  cookie,
}: {
  issueId: string;
  format: PrintFormat;
  requestUrl: string;
  cookie: string | null;
}) {
  const timeout = resolveTimeoutMs();
  // The app user has no home: Chromium gets its own writable profile, home and
  // crash dump folder, or its crash handler refuses to start.
  const workDir = await mkdtemp(join(tmpdir(), "middleware-print-"));
  const browser = await step("launch", () =>
    puppeteer.launch({
      executablePath: resolveChromiumExecutablePath(),
      headless: true,
      userDataDir: join(workDir, "profile"),
      env: {
        ...process.env,
        HOME: workDir,
        XDG_CONFIG_HOME: join(workDir, ".config"),
        XDG_CACHE_HOME: join(workDir, ".cache"),
      },
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-crash-reporter",
        `--crash-dumps-dir=${join(workDir, "crashes")}`,
      ],
    }),
  ).catch(async (error: unknown) => {
    await rm(workDir, { recursive: true, force: true });
    throw error;
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(timeout);
    page.setDefaultTimeout(timeout);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    const origin = resolveRenderOrigin(requestUrl);
    const cookies = toViewerCookies(cookie, origin);
    if (cookies.length > 0) await browser.setCookie(...cookies);

    const viewerUrl = new URL(`/cms/print/${issueId}`, origin);
    viewerUrl.searchParams.set("format", format);
    viewerUrl.searchParams.set("render", "pdf");
    const response = await step("open viewer", () =>
      page.goto(viewerUrl.toString(), { waitUntil: "load" }),
    );
    if (!response?.ok() || !new URL(page.url()).pathname.startsWith("/cms/print/")) {
      throw new Error(
        `PDF render failed at "open viewer": ${response?.status() ?? "no response"} at ${page.url()}`,
      );
    }

    await step("paginate", () =>
      page.waitForSelector('[data-print-status="ready"], [data-print-status="error"]'),
    );
    const status = await page.$eval("[data-print-status]", (element) =>
      element.getAttribute("data-print-status"),
    );
    if (status !== "ready") {
      throw new Error(`PDF render failed at "paginate": ${pageErrors.join(" | ") || status}`);
    }

    await step("load assets", async () => {
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        Array.from(document.images).every((image) => image.complete),
      );
    });
    await page.emulateMediaType("print");

    return await step("print", () =>
      page.pdf({ preferCSSPageSize: true, printBackground: true, timeout }),
    );
  } finally {
    await browser.close();
    await rm(workDir, { recursive: true, force: true });
  }
}
