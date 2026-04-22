import { CmsBreadcrumbs, CmsSidebar, CmsTopbar } from "@/components/cms/layout";
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
      sidebar={<CmsSidebar role={role} />}
      topbar={
        <div className="space-y-2">
          <CmsTopbar role={role} />
          <div className="px-5 pb-3">
            <CmsBreadcrumbs />
          </div>
        </div>
      }
    >
      {children}
    </CmsLayoutShell>
  );
}
