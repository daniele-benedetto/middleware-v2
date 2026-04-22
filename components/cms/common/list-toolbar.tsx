"use client";

import { CmsSearchBar } from "@/components/cms/primitives";
import { i18n } from "@/lib/i18n";

import type { ReactNode } from "react";

type CmsListToolbarProps = {
  rightSlot?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function CmsListToolbar({ rightSlot, searchValue, onSearchChange }: CmsListToolbarProps) {
  const text = i18n.cms.listToolbar;

  return (
    <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
      <div className="w-full max-w-120">
        <CmsSearchBar
          placeholder={text.searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}
