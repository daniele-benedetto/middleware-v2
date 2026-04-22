"use client";

import { SearchIcon } from "lucide-react";

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
  placeholder = "CERCA…",
  value,
  ...props
}: CmsSearchBarProps) {
  const hasResults = Boolean(resultsSlot);
  const accent = active || hasResults;

  return (
    <div
      className={cn(
        "bg-white",
        accent ? "border-2 border-accent" : "border border-foreground",
        className,
      )}
    >
      <div className="flex">
        <div
          className={cn(
            "flex items-center px-[14px] py-[10px]",
            accent ? "border-r border-[color:var(--ink-30)]" : "border-r border-foreground",
          )}
        >
          <SearchIcon className={cn("size-[14px]", accent ? "text-accent" : "text-foreground")} />
        </div>
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          className={cn(
            "flex-1 rounded-none border-0 bg-transparent px-[12px] py-[10px] outline-none",
            "font-ui text-[12px] uppercase tracking-[0.04em] appearance-none",
            "placeholder:text-[color:var(--ink-30)]",
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
        "block w-full px-[14px] py-[7px] text-left transition-none",
        "font-ui text-[11px] uppercase tracking-[0.04em] text-foreground",
        "border-b border-[color:var(--bg-hover)] last:border-b-0",
        active ? "bg-[color:var(--bg-hover)]" : "bg-white hover:bg-[color:var(--bg-hover)]",
      )}
    >
      {title}
      {meta ? (
        <span
          className={cn(
            "ml-[8px] text-[10px]",
            metaAccent ? "text-accent" : "text-[color:var(--ink-60)]",
          )}
        >
          {meta}
        </span>
      ) : null}
    </button>
  );
}
