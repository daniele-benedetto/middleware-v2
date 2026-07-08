import { connection } from "next/server";
import { Suspense } from "react";

import { CookieConsentBanner, PublicFooter, PublicHeader } from "@/components/public";
import { CustomCursor } from "@/components/public/custom-cursor";
import { PublicPageTransition } from "@/components/public/public-page-transition";
import { PublicScrollProgress } from "@/components/public/public-scroll-progress";
import { i18n } from "@/lib/i18n";
import { publicFeatures } from "@/lib/public/config";
import { getLegalConsentVersion } from "@/lib/public/server/legal-consent";
import { getPublicNavigation } from "@/lib/public/server/navigation";

import type { ReactNode } from "react";

async function PublicHeaderSlot() {
  await connection();
  const navigation = await getPublicNavigation();

  return <PublicHeader menuItems={navigation.main} />;
}

async function PublicFooterSlot() {
  await connection();
  const navigation = await getPublicNavigation();

  return (
    <PublicFooter sectionsLinks={navigation.footerSections} legalLinks={navigation.footerLegal} />
  );
}

async function CookieConsentSlot() {
  await connection();
  const legalConsentVersion = await getLegalConsentVersion();

  return legalConsentVersion ? <CookieConsentBanner consentVersion={legalConsentVersion} /> : null;
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-background font-heading text-foreground">
      <a
        href="#main-content"
        className="sr-only z-200 bg-foreground px-4 py-3 font-heading text-sm font-bold text-background uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-3 focus:outline-offset-2 focus:outline-accent"
      >
        {i18n.public.header.skipToContent}
      </a>
      <Suspense fallback={null}>
        <PublicHeaderSlot />
      </Suspense>
      <PublicScrollProgress />
      <div data-public-page-content>
        <PublicPageTransition>{children}</PublicPageTransition>
      </div>
      <div data-public-footer>
        <Suspense fallback={null}>
          <PublicFooterSlot />
        </Suspense>
      </div>
      {publicFeatures.cookieConsentBanner ? (
        <Suspense fallback={null}>
          <CookieConsentSlot />
        </Suspense>
      ) : null}
      <CustomCursor />
    </div>
  );
}
