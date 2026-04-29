import { SearchIcon } from "lucide-react";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { InputHTMLAttributes, ReactNode } from "react";

type CmsSearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  active?: boolean;
  className?: string;
  resultsSlot?: ReactNode;
};

export function CmsSearchBar({
  active = false,
  className,
  resultsSlot,
  placeholder = i18n.cms.listToolbar.searchPlaceholder,
  value,
  ...props
}: CmsSearchBarProps) {
  const hasResults = Boolean(resultsSlot);
  const accent = active || hasResults;

  return (
    <div
      className={cn(
        "bg-white",
        accent
          ? "border border-accent"
          : "border border-foreground focus-within:border focus-within:border-accent",
        className,
      )}
    >
      <div className={cn("flex", hasResults && "border-b border-border")}>
        <div
          className={cn(
            "flex items-center px-3.5 py-2.5",
            accent ? "border-r border-border" : "border-r border-foreground",
          )}
        >
          <SearchIcon className={cn("size-3.5", accent ? "text-accent" : "text-foreground")} />
        </div>
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          className={cn(
            "flex-1 rounded-none border-0 bg-transparent px-3 py-2.5 outline-none",
            "focus-visible:outline-none focus-visible:ring-0",
            "font-ui text-[12px] uppercase tracking-[0.04em] appearance-none",
            "placeholder:text-border",
            accent ? "text-accent" : "text-foreground",
          )}
          {...props}
        />
      </div>
      {resultsSlot}
    </div>
  );
}

type CmsSearchResultItemProps = {
  title: string;
  meta?: string;
  metaAccent?: boolean;
  active?: boolean;
  onSelect?: () => void;
};

export function CmsSearchResultItem({
  title,
  meta,
  metaAccent = false,
  active = false,
  onSelect,
}: CmsSearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "block w-full px-3.5 py-1.75 text-left transition-none",
        "font-ui text-[11px] uppercase tracking-[0.04em] text-foreground",
        "border-b border-card-hover last:border-b-0",
        active ? "bg-card-hover" : "bg-white hover:bg-card-hover",
      )}
    >
      {title}
      {meta ? (
        <span
          className={cn("ml-2 text-[10px]", metaAccent ? "text-accent" : "text-muted-foreground")}
        >
          {meta}
        </span>
      ) : null}
    </button>
  );
}
