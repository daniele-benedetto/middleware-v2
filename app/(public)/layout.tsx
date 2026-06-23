import { PublicFooter, PublicHeader } from "@/components/public";
import { PublicPageTransition } from "@/components/public/public-page-transition";

import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col bg-background font-heading text-foreground">
      <PublicHeader />
      <PublicPageTransition>{children}</PublicPageTransition>
      <PublicFooter />
    </div>
  );
}
