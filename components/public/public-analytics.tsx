"use client";

import { useEffect } from "react";

import { trackPublicAnalyticsEvent } from "@/lib/public/analytics";
import { usePrivacyChoice } from "@/lib/public/privacy-consent";

import type { PublicAnalyticsEventData, PublicAnalyticsEventName } from "@/lib/public/analytics";
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
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a[data-public-analytics-event]");
      if (!link) return;

      const eventName = link.dataset.publicAnalyticsEvent as PublicAnalyticsEventName | undefined;
      if (!eventName) return;

      try {
        const eventData = link.dataset.publicAnalyticsData
          ? (JSON.parse(link.dataset.publicAnalyticsData) as PublicAnalyticsEventData)
          : undefined;
        trackPublicAnalyticsEvent(eventName, eventData);
      } catch {
        trackPublicAnalyticsEvent(eventName);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

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
