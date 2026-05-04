import { CmsShellSystemState } from "@/components/cms/common/shell-system-state";

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
    <CmsShellSystemState
      size="sm"
      title={title}
      code="400"
      description={resolvedDescription}
      descriptionTone="muted"
      actions={action}
    />
  );
}
