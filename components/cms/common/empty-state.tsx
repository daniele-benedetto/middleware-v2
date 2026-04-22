import { CmsBody, CmsDisplay, CmsMetaText, CmsSurface } from "@/components/cms/primitives";

import type { ReactNode } from "react";

type CmsEmptyStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
};

export function CmsEmptyState({ title, description, eyebrow, action }: CmsEmptyStateProps) {
  return (
    <CmsSurface
      border="default"
      spacing="xl"
      className="flex flex-col items-center gap-[12px] text-center"
    >
      {eyebrow ? (
        <CmsMetaText variant="category" className="block">
          {eyebrow}
        </CmsMetaText>
      ) : null}
      <CmsDisplay as="h2" size="h2">
        {title}
      </CmsDisplay>
      <CmsBody size="md" tone="muted" className="max-w-[480px]">
        {description}
      </CmsBody>
      {action ? <div className="mt-[6px]">{action}</div> : null}
    </CmsSurface>
  );
}
