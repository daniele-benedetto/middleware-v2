"use client";

import { useEffect } from "react";

import { usePrivacyChoice } from "@/lib/public/privacy-consent";

import type { PrivacyBannerMode } from "@/lib/public/privacy-consent";

type PublicAnalyticsProps = {
  consentVersion: string;
  scriptSrc: string | null;
  websiteId: string | null;
  bannerMode: PrivacyBannerMode;
  domains: string | null;
  performance: boolean;
  doNotTrack: boolean;
  excludeSearch: boolean;
  excludeHash: boolean;
};

export function PublicAnalytics({
  consentVersion,
  scriptSrc,
  websiteId,
  bannerMode,
  domains,
  performance,
  doNotTrack,
  excludeSearch,
  excludeHash,
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
      if (domains) script.dataset.domains = domains;
      if (performance) script.dataset.performance = "true";
      if (doNotTrack) script.dataset.doNotTrack = "true";
      if (excludeSearch) script.dataset.excludeSearch = "true";
      if (excludeHash) script.dataset.excludeHash = "true";
      document.body.appendChild(script);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = globalThis.setTimeout(load, 1500);
    return () => globalThis.clearTimeout(timerId);
  }, [
    doNotTrack,
    domains,
    excludeHash,
    excludeSearch,
    performance,
    scriptSrc,
    shouldLoad,
    websiteId,
  ]);

  return null;
}
