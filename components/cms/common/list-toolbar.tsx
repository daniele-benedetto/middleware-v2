import { Input } from "@/components/ui/input";
import { cmsInputClass } from "@/lib/cms/ui/variants";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsListToolbarProps = {
  rightSlot?: ReactNode;
};

export function CmsListToolbar({ rightSlot }: CmsListToolbarProps) {
  const text = i18n.cms.listToolbar;

  return (
    <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
      <Input placeholder={text.searchPlaceholder} className={cn(cmsInputClass, "w-full")} />
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}
