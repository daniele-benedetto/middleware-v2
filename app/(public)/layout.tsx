import { PublicPageTransition } from "@/components/public/public-page-transition";

import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicPageTransition>{children}</PublicPageTransition>;
}
