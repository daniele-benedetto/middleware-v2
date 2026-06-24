import { ViewTransitions } from "next-view-transitions";
import { Suspense } from "react";

import { requireCmsSession } from "@/lib/cms/auth";

import type { ReactNode } from "react";

type CmsPreviewLayoutProps = {
  children: ReactNode;
};

async function CmsPreviewAuthGate({ children }: CmsPreviewLayoutProps) {
  await requireCmsSession();

  return <>{children}</>;
}

export default function CmsPreviewLayout({ children }: CmsPreviewLayoutProps) {
  // These are dynamic [id] routes with no generateStaticParams, so everything
  // here (the ViewTransitions provider's usePathname, the session gate, the page
  // params/prefetch) is request-time. One outer <Suspense> covers it all.
  return (
    <Suspense fallback={null}>
      <ViewTransitions>
        <CmsPreviewAuthGate>{children}</CmsPreviewAuthGate>
      </ViewTransitions>
    </Suspense>
  );
}
