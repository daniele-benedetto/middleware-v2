import { Suspense } from "react";

import { requireCmsSession } from "@/lib/cms/auth";

import type { ReactNode } from "react";

// CMS utilities (full stylesheet), layered after the public app/globals.css.
import "@/app/cms.css";

type CmsPreviewLayoutProps = {
  children: ReactNode;
};

async function CmsPreviewAuthGate({ children }: CmsPreviewLayoutProps) {
  await requireCmsSession();

  return <>{children}</>;
}

export default function CmsPreviewLayout({ children }: CmsPreviewLayoutProps) {
  return (
    <Suspense fallback={null}>
      <CmsPreviewAuthGate>{children}</CmsPreviewAuthGate>
    </Suspense>
  );
}
