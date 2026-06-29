"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useSyncExternalStore } from "react";

import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicLink } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CookieConsentBannerProps = {
  consentVersion: string;
};

type StoredConsent = {
  version: string;
  choice: "accepted" | "rejected";
  decidedAt: string;
  expiresAt: string;
};

const consentCookieName = "mw_cookie_consent";
const consentMaxAgeSeconds = 60 * 60 * 24 * 180;
const consentChangeEvent = "mw-cookie-consent-change";

function readConsentCookie(): StoredConsent | null {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${consentCookieName}=`));

  if (!cookie) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("="))) as StoredConsent;
  } catch {
    return null;
  }
}

function hasValidDecision(consent: StoredConsent | null, consentVersion: string) {
  if (!consent || consent.version !== consentVersion) {
    return null;
  }

  if (new Date(consent.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return consent.choice;
}

function writeConsentCookie(consentVersion: string, choice: StoredConsent["choice"]) {
  const decidedAt = new Date();
  const expiresAt = new Date(decidedAt.getTime() + consentMaxAgeSeconds * 1000);
  const value = encodeURIComponent(
    JSON.stringify({
      version: consentVersion,
      choice,
      decidedAt: decidedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    } satisfies StoredConsent),
  );
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${consentCookieName}=${value}; Path=/; Max-Age=${consentMaxAgeSeconds}; SameSite=Lax${secure}`;
}

function subscribeToConsentChange(callback: () => void) {
  window.addEventListener(consentChangeEvent, callback);

  return () => {
    window.removeEventListener(consentChangeEvent, callback);
  };
}

function getServerConsentSnapshot() {
  return "pending";
}

function getConsentSnapshot(consentVersion: string) {
  return hasValidDecision(readConsentCookie(), consentVersion) ?? "missing";
}

export function CookieConsentBanner({ consentVersion }: CookieConsentBannerProps) {
  const consentState = useSyncExternalStore(
    subscribeToConsentChange,
    () => getConsentSnapshot(consentVersion),
    getServerConsentSnapshot,
  );
  const text = i18n.public.cookieConsent;
  const accepted = consentState === "accepted";
  const decided = consentState === "accepted" || consentState === "rejected";
  const ready = consentState !== "pending";

  useEffect(() => {
    if (!ready || decided) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [decided, ready]);

  const saveDecision = (choice: StoredConsent["choice"]) => {
    writeConsentCookie(consentVersion, choice);
    window.dispatchEvent(new Event(consentChangeEvent));
  };

  return (
    <>
      {accepted ? (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      ) : null}

      {ready && !decided ? (
        <>
          <div
            className="fixed inset-0 z-100 cursor-not-allowed bg-transparent"
            aria-hidden="true"
          />
          <section
            aria-labelledby="cookie-consent-title"
            className="starting:translate-y-full starting:opacity-0 fixed inset-x-0 bottom-0 z-110 translate-y-0 border-t-2 border-foreground bg-background text-foreground opacity-100 shadow-[0_-16px_40px_rgba(0,0,0,0.14)] transition-[opacity,transform] duration-(--motion-slow) ease-(--easing-standard)"
          >
            <div className={cn(publicContentClassName, "grid gap-5 py-5 sm:py-6")}>
              <div>
                <p className={cn(publicTypography.smallKicker, "mb-2 text-accent")}>
                  {text.kicker}
                </p>
                <h2
                  id="cookie-consent-title"
                  className="font-heading text-[clamp(24px,3vw,34px)] leading-none font-black tracking-[-0.03em] uppercase"
                >
                  {text.title}
                </h2>
              </div>

              <p className="font-editorial text-[15px] leading-relaxed text-body-text sm:text-[16px]">
                {text.description}{" "}
                <PublicLink
                  href="/privacy-policy"
                  className="font-heading font-bold underline underline-offset-4"
                >
                  {text.privacyLink}
                </PublicLink>{" "}
                <span aria-hidden="true">/</span>{" "}
                <PublicLink
                  href="/cookie-policy"
                  className="font-heading font-bold underline underline-offset-4"
                >
                  {text.cookieLink}
                </PublicLink>
              </p>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-foreground bg-background px-5 py-2.5 font-heading text-sm font-extrabold tracking-[0.08em] text-foreground uppercase transition-colors duration-(--motion-fast) hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => saveDecision("rejected")}
                >
                  {text.reject}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-foreground bg-foreground px-5 py-2.5 font-heading text-sm font-extrabold tracking-[0.08em] text-background uppercase transition-colors duration-(--motion-fast) hover:bg-accent hover:text-background focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => saveDecision("accepted")}
                >
                  {text.accept}
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
