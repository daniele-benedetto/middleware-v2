import { Input } from "@/components/ui/input";
import { i18n } from "@/lib/i18n";

import type { ReactNode } from "react";

type CmsListToolbarProps = {
  rightSlot?: ReactNode;
};

export function CmsListToolbar({ rightSlot }: CmsListToolbarProps) {
  const text = i18n.cms.listToolbar;

  return (
    <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
      <Input
        placeholder={text.searchPlaceholder}
        className="h-9 border-[#0A0A0A] bg-[#F0E8D8] font-ui text-[11px] uppercase tracking-[0.08em]"
      />
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}
