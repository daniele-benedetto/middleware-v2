import { CmsBreadcrumbs, CmsSidebar, CmsTopbar } from "@/components/cms/layout";
import { CmsLayoutShell } from "@/components/cms/primitives";

import type { ReactNode } from "react";

type CmsLayoutProps = {
  children: ReactNode;
};

export default function CmsLayout({ children }: CmsLayoutProps) {
  return (
    <CmsLayoutShell
      sidebar={<CmsSidebar />}
      topbar={
        <div className="space-y-2">
          <CmsTopbar />
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
