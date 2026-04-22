import { CmsSectionDivider } from "@/components/cms/primitives/section-divider";
import {
  CmsBodyText,
  CmsHeading,
  cmsEyebrowClassName,
} from "@/components/cms/primitives/typography";

import type { ReactNode } from "react";

type CmsPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function CmsPageHeader({ title, subtitle, actions }: CmsPageHeaderProps) {
  return (
    <div className="mb-6 pb-4">
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <CmsHeading size="page">{title}</CmsHeading>
          {subtitle ? <CmsBodyText className="mt-2">{subtitle}</CmsBodyText> : null}
        </div>
        {actions ? <div className={cmsEyebrowClassName}>{actions}</div> : null}
      </div>
      <CmsSectionDivider tone="strong" className="mt-4" />
    </div>
  );
}
