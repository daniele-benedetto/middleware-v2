"use client";

import { useEffect } from "react";

import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicLink } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";
import { publicPrivacy } from "@/lib/public/config";
import { usePrivacyChoice, writePrivacyDecision } from "@/lib/public/privacy-consent";
import { cn } from "@/lib/utils";

type CookieConsentBannerProps = {
  consentVersion: string;
};

export function CookieConsentBanner({ consentVersion }: CookieConsentBannerProps) {
  const consentState = usePrivacyChoice(consentVersion);
  const text = i18n.public.cookieConsent;
  const mode = publicPrivacy.bannerMode;
  const copy = mode === "consent" ? text.consent : text.acknowledge;
  const decided =
    consentState === "accepted" || consentState === "rejected" || consentState === "acknowledged";
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

  const saveDecision = (choice: "acknowledged" | "accepted" | "rejected") => {
    writePrivacyDecision(consentVersion, choice);
  };

  return (
    <>
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
                  {copy.title}
                </h2>
              </div>

              <p className="font-editorial text-[15px] leading-relaxed text-body-text sm:text-[16px]">
                {copy.description}{" "}
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
                {mode === "consent" ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-foreground bg-background px-5 py-2.5 font-heading text-sm font-extrabold tracking-[0.08em] text-foreground uppercase transition-colors duration-(--motion-fast) hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={() => saveDecision("rejected")}
                  >
                    {text.reject}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-foreground bg-foreground px-5 py-2.5 font-heading text-sm font-extrabold tracking-[0.08em] text-background uppercase transition-colors duration-(--motion-fast) hover:bg-accent hover:text-background focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  onClick={() => saveDecision(mode === "consent" ? "accepted" : "acknowledged")}
                >
                  {mode === "consent" ? text.accept : text.understand}
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
