import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import { CmsHeading } from "@/components/cms/primitives/typography";

import type { ReactNode } from "react";

type CmsPageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function CmsPageHeader({ title, actions }: CmsPageHeaderProps) {
  return (
    <div className="mb-6 pb-4">
      <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <CmsHeading size="page">{title}</CmsHeading>
        </div>
        {actions ? (
          <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-wrap">{actions}</div>
        ) : null}
      </div>
      <CmsSectionDivider tone="strong" className="mt-4" />
    </div>
  );
}
