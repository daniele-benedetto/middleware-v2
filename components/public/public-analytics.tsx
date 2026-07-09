"use client";

import Script from "next/script";

import { isPublicAnalyticsEnabled, publicAnalytics, publicPrivacy } from "@/lib/public/config";
import { usePrivacyChoice } from "@/lib/public/privacy-consent";

type PublicAnalyticsProps = {
  consentVersion: string;
};

export function PublicAnalytics({ consentVersion }: PublicAnalyticsProps) {
  const privacyChoice = usePrivacyChoice(consentVersion);

  if (!isPublicAnalyticsEnabled()) {
    return null;
  }

  if (publicPrivacy.bannerMode === "consent" && privacyChoice !== "accepted") {
    return null;
  }

  return (
    <Script
      src={publicAnalytics.umamiScriptSrc ?? undefined}
      data-website-id={publicAnalytics.umamiWebsiteId ?? undefined}
      strategy="afterInteractive"
    />
  );
}
