"use client";

import Script from "next/script";

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

  if (!scriptSrc || !websiteId) {
    return null;
  }

  if (bannerMode === "consent" && privacyChoice !== "accepted") {
    return null;
  }

  return <Script src={scriptSrc} data-website-id={websiteId} strategy="afterInteractive" />;
}
