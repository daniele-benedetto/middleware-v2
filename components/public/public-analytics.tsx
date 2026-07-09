"use client";

import { useEffect } from "react";

import { usePrivacyChoice } from "@/lib/public/privacy-consent";

import type { PrivacyBannerMode } from "@/lib/public/privacy-consent";

type PublicAnalyticsProps = {
  consentVersion: string;
  scriptSrc: string | null;
  websiteId: string | null;
  bannerMode: PrivacyBannerMode;
};

export function PublicAnalytics({
  consentVersion,
  scriptSrc,
  websiteId,
  bannerMode,
}: PublicAnalyticsProps) {
  const privacyChoice = usePrivacyChoice(consentVersion);
  const shouldLoad = Boolean(
    scriptSrc && websiteId && (bannerMode !== "consent" || privacyChoice === "accepted"),
  );

  useEffect(() => {
    if (!shouldLoad || !scriptSrc || !websiteId) return;
    if (document.querySelector(`script[src="${scriptSrc}"]`)) return;

    const load = () => {
      const script = document.createElement("script");
      script.defer = true;
      script.src = scriptSrc;
      script.dataset.websiteId = websiteId;
      document.body.appendChild(script);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = globalThis.setTimeout(load, 1500);
    return () => globalThis.clearTimeout(timerId);
  }, [scriptSrc, shouldLoad, websiteId]);

  return null;
}
