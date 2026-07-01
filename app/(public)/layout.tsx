import { CookieConsentBanner, PublicFooter, PublicHeader } from "@/components/public";
import { CustomCursor } from "@/components/public/custom-cursor";
import { PublicPageTransition } from "@/components/public/public-page-transition";
import { PublicObservabilityTracker } from "@/components/telemetry/public-observability-tracker";
import { i18n } from "@/lib/i18n";
import { getLegalConsentVersion } from "@/lib/public/server/legal-consent";
import { getPublicNavigation } from "@/lib/public/server/navigation";

import type { ReactNode } from "react";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [legalConsentVersion, navigation] = await Promise.all([
    getLegalConsentVersion(),
    getPublicNavigation(),
  ]);

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-background font-heading text-foreground">
      <a
        href="#main-content"
        className="sr-only z-200 bg-foreground px-4 py-3 font-heading text-sm font-bold text-background uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-3 focus:outline-offset-2 focus:outline-accent"
      >
        {i18n.public.header.skipToContent}
      </a>
      <PublicHeader menuItems={navigation.main} />
      <div data-public-page-content>
        <PublicPageTransition>{children}</PublicPageTransition>
      </div>
      <div data-public-footer>
        <PublicFooter
          sectionsLinks={navigation.footerSections}
          legalLinks={navigation.footerLegal}
        />
      </div>
      <CookieConsentBanner consentVersion={legalConsentVersion} />
      <CustomCursor />
      <PublicObservabilityTracker />
    </div>
  );
}
