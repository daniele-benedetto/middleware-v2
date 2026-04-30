import { CmsBody, CmsDisplay, CmsMetaText, CmsSurface } from "@/components/cms/primitives";

import type { ReactNode } from "react";

type CmsShellSystemStateProps = {
  code: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function CmsShellSystemState({
  code,
  title,
  description,
  actions,
}: CmsShellSystemStateProps) {
  return (
    <div className="flex min-h-0 flex-1 items-start">
      <CmsSurface border="strong" spacing="xl" className="flex w-full flex-col items-start gap-4">
        <CmsMetaText variant="category" className="block">
          {code}
        </CmsMetaText>
        <CmsDisplay as="h1" size="h1">
          {title}
        </CmsDisplay>
        <CmsBody size="md" tone="foreground" className="max-w-130">
          {description}
        </CmsBody>
        {actions ? <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div> : null}
      </CmsSurface>
    </div>
  );
}
