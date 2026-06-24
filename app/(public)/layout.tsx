import { PublicFooter, PublicHeader } from "@/components/public";
import { PublicPageTransition } from "@/components/public/public-page-transition";
import { i18n } from "@/lib/i18n";

import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-background font-heading text-foreground">
      <a
        href="#main-content"
        className="sr-only z-200 bg-foreground px-4 py-3 font-heading text-sm font-bold text-background uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-3 focus:outline-offset-2 focus:outline-accent"
      >
        {i18n.public.header.skipToContent}
      </a>
      <PublicHeader />
      <div data-public-page-content>
        <PublicPageTransition>{children}</PublicPageTransition>
      </div>
      <div data-public-footer>
        <PublicFooter />
      </div>
    </div>
  );
}
