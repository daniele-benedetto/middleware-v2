import { CmsBody, CmsDisplay, CmsSurface } from "@/components/cms/primitives";

import type { ReactNode } from "react";

type CmsEmptyStateProps = {
  title: string;
  description: string;
  descriptionFiltered?: string;
  hasActiveFilters?: boolean;
  action?: ReactNode;
};

export function CmsEmptyState({
  title,
  description,
  descriptionFiltered,
  hasActiveFilters = false,
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
