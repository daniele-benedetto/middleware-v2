import { Suspense } from "react";

import {
  CookieConsentBanner,
  PublicAnalytics,
  PublicFooter,
  PublicHeader,
} from "@/components/public";
import { PublicPageTransition } from "@/components/public/public-page-transition";
import { PublicScrollProgress } from "@/components/public/public-scroll-progress";
import { i18n } from "@/lib/i18n";
import { publicAnalytics, publicFeatures, publicPrivacy } from "@/lib/public/config";
import { getLegalConsentVersion } from "@/lib/public/server/legal-consent";
import { getPublicNavigation } from "@/lib/public/server/navigation";

import type { ReactNode } from "react";

type PublicNavigationPromise = ReturnType<typeof getPublicNavigation>;
type LegalConsentVersionPromise = ReturnType<typeof getLegalConsentVersion>;

async function PublicHeaderSlot({
  navigationPromise,
}: {
  navigationPromise: PublicNavigationPromise;
}) {
  const navigation = await navigationPromise;

  return <PublicHeader menuItems={navigation.main} />;
}

async function PublicFooterSlot({
  navigationPromise,
}: {
  navigationPromise: PublicNavigationPromise;
}) {
  const navigation = await navigationPromise;

  return (
    <PublicFooter sectionsLinks={navigation.footerSections} legalLinks={navigation.footerLegal} />
  );
}

async function CookieConsentSlot({
  legalConsentVersionPromise,
}: {
  legalConsentVersionPromise: LegalConsentVersionPromise;
}) {
  const legalConsentVersion = await legalConsentVersionPromise;

  return legalConsentVersion ? <CookieConsentBanner consentVersion={legalConsentVersion} /> : null;
}

async function PublicAnalyticsSlot({
  legalConsentVersionPromise,
}: {
  legalConsentVersionPromise: LegalConsentVersionPromise;
}) {
  const legalConsentVersion = await legalConsentVersionPromise;

  return (
    <PublicAnalytics
      consentVersion={legalConsentVersion}
      scriptSrc={publicAnalytics.umamiScriptSrc}
      websiteId={publicAnalytics.umamiWebsiteId}
      bannerMode={publicPrivacy.bannerMode}
      domains={publicAnalytics.umamiDomains}
      performance={publicAnalytics.umamiPerformance}
      doNotTrack={publicAnalytics.umamiDoNotTrack}
      excludeSearch={publicAnalytics.umamiExcludeSearch}
      excludeHash={publicAnalytics.umamiExcludeHash}
    />
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  const navigationPromise = getPublicNavigation();
  const legalConsentVersionPromise = getLegalConsentVersion();

  return (
    <div
      data-public-shell
      className="flex min-h-svh flex-1 flex-col bg-background font-heading text-foreground"
    >
      <a
        href="#main-content"
        className="sr-only z-200 bg-foreground px-4 py-3 font-heading text-sm font-bold text-background uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-3 focus:outline-offset-2 focus:outline-accent"
      >
        {i18n.public.header.skipToContent}
      </a>
      <Suspense fallback={null}>
        <PublicHeaderSlot navigationPromise={navigationPromise} />
      </Suspense>
      <PublicScrollProgress />
      <div data-public-page-content>
        <PublicPageTransition>{children}</PublicPageTransition>
      </div>
      <div data-public-footer>
        <Suspense fallback={null}>
          <PublicFooterSlot navigationPromise={navigationPromise} />
        </Suspense>
      </div>
      {publicFeatures.cookieConsentBanner ? (
        <Suspense fallback={null}>
          <CookieConsentSlot legalConsentVersionPromise={legalConsentVersionPromise} />
        </Suspense>
      ) : null}
      <Suspense fallback={null}>
        <PublicAnalyticsSlot legalConsentVersionPromise={legalConsentVersionPromise} />
      </Suspense>
    </div>
  );
}
