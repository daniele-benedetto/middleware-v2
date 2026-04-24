import { CmsBreadcrumbs, CmsSidebar } from "@/components/cms/layout";
import { CmsLayoutShell } from "@/components/cms/primitives";
import { requireCmsSession } from "@/lib/cms/auth";

import type { ReactNode } from "react";

type CmsLayoutProps = {
  children: ReactNode;
};

export default async function CmsLayout({ children }: CmsLayoutProps) {
  const session = await requireCmsSession("/cms");

  const role = session.user.role;

  return (
    <CmsLayoutShell
      sidebar={
        <CmsSidebar role={role} userName={session.user.name} userEmail={session.user.email} />
      }
      topbar={
        <div className="space-y-2">
          <div className="px-5 p-3">
            <CmsBreadcrumbs />
          </div>
        </div>
      }
    >
      {children}
    </CmsLayoutShell>
  );
}
