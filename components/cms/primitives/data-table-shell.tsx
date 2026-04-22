import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { CmsSurface } from "@/components/cms/primitives/surface";

import type { ReactNode } from "react";

type CmsDataTableShellProps = {
  toolbar: ReactNode;
  table: ReactNode;
  pagination: ReactNode;
};

export function CmsDataTableShell({ toolbar, table, pagination }: CmsDataTableShellProps) {
  return (
    <CmsSurface spacing="none">
      <div className="p-4">{toolbar}</div>
      <CmsSectionDivider />
      <div className="overflow-x-auto">{table}</div>
      <CmsSectionDivider />
      <div className="p-4">{pagination}</div>
    </CmsSurface>
  );
}
