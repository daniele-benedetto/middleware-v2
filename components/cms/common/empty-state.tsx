import { CmsBody, CmsDisplay, CmsMetaText, CmsSurface } from "@/components/cms/primitives";

import type { ReactNode } from "react";

type CmsEmptyStateProps = {
  title: string;
  description: string;
  descriptionFiltered?: string;
  hasActiveFilters?: boolean;
  eyebrow?: string;
  action?: ReactNode;
};

export function CmsEmptyState({
  title,
  description,
  descriptionFiltered,
  hasActiveFilters = false,
  eyebrow,
  action,
}: CmsEmptyStateProps) {
  const resolvedDescription =
    hasActiveFilters && descriptionFiltered ? descriptionFiltered : description;

  return (
    <CmsSurface
      border="default"
      spacing="xl"
      className="flex flex-col items-center gap-3 text-center"
    >
      {eyebrow ? (
        <CmsMetaText variant="category" className="block">
          {eyebrow}
        </CmsMetaText>
      ) : null}
      <CmsDisplay as="h2" size="h2">
        {title}
      </CmsDisplay>
      <CmsBody size="md" tone="muted" className="max-w-120">
        {resolvedDescription}
      </CmsBody>
      {action ? <div className="mt-1.5">{action}</div> : null}
    </CmsSurface>
  );
}
