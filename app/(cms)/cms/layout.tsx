import { CmsSidebar } from "@/components/cms/layout";
import { CmsLayoutShell } from "@/components/cms/primitives";
import { requireCmsSession } from "@/lib/cms/auth";
import { i18n } from "@/lib/i18n";
import { buildCmsMetadata } from "@/lib/seo";

import type { ReactNode } from "react";

type CmsLayoutProps = {
  children: ReactNode;
};

export const metadata = buildCmsMetadata({
  title: i18n.cms.navigation.app,
  description: i18n.cms.app.metadataDescription,
  path: "/cms/issues",
});

export default async function CmsLayout({ children }: CmsLayoutProps) {
  const session = await requireCmsSession();

  const role = session.user.role;

  return (
    <CmsLayoutShell
      sidebar={
        <CmsSidebar role={role} userName={session.user.name} userEmail={session.user.email} />
      }
    >
      {children}
    </CmsLayoutShell>
  );
}
