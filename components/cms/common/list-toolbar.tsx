import { CmsTextInput } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

import type { ReactNode } from "react";

type CmsListToolbarProps = {
  rightSlot?: ReactNode;
};

export function CmsListToolbar({ rightSlot }: CmsListToolbarProps) {
  const text = i18n.cms.listToolbar;

  return (
    <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
      <CmsTextInput placeholder={text.searchPlaceholder} className="w-full" tone="ui" />
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}
