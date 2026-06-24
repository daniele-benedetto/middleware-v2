import { ViewTransitions } from "next-view-transitions";

import { requireCmsSession } from "@/lib/cms/auth";

import type { ReactNode } from "react";

type CmsPreviewLayoutProps = {
  children: ReactNode;
};

export default async function CmsPreviewLayout({ children }: CmsPreviewLayoutProps) {
  await requireCmsSession();

  return <ViewTransitions>{children}</ViewTransitions>;
}
