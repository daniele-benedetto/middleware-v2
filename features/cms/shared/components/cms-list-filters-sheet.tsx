"use client";

import { useState } from "react";

import { CmsActionButton } from "@/components/cms/primitives";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type CmsListFiltersSheetProps = {
  activeFiltersCount?: number;
  title?: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  onApply: () => void | Promise<unknown>;
  onClear: () => void;
  onOpenChange?: (open: boolean) => void;
};

export function CmsListFiltersSheet({
  activeFiltersCount = 0,
  title,
  description,
  className,
  contentClassName,
  children,
  onApply,
  onClear,
  onOpenChange,
}: CmsListFiltersSheetProps) {
  const [open, setOpen] = useState(false);
  const text = i18n.cms.listToolbar;
  const commonText = i18n.cms.common;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleApply = () => {
    void Promise.resolve(onApply()).finally(() => {
      handleOpenChange(false);
    });
  };

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger
          render={
            <CmsActionButton
              variant={activeFiltersCount > 0 ? "outline-accent" : "outline"}
              size="xs"
              className="w-full justify-center"
            >
              {text.filtersTrigger(activeFiltersCount)}
            </CmsActionButton>
          }
        />

        <SheetContent side="right" className="w-full max-w-96 bg-background">
          <div className="flex items-start justify-between gap-4 border-b-[3px] border-foreground p-5">
            <div className="leading-[1.23]">
              <SheetTitle>{title ?? text.filtersTitle}</SheetTitle>
              <SheetDescription>{description ?? text.filtersDescription}</SheetDescription>
            </div>

            <CmsActionButton variant="outline" size="xs" onClick={() => handleOpenChange(false)}>
              {commonText.close}
            </CmsActionButton>
          </div>

          <div className="cms-scroll flex-1 overflow-y-auto p-5">
            <div className={cn("grid gap-3", contentClassName)}>{children}</div>
          </div>

          <div className="border-t-[3px] border-foreground p-5">
            <div className="flex gap-2 max-sm:flex-col">
              <CmsActionButton
                variant="outline"
                size="xs"
                className="flex-1 justify-center"
                onClick={onClear}
              >
                {text.clearFilters}
              </CmsActionButton>

              <CmsActionButton
                variant="primary"
                size="xs"
                className="flex-1 justify-center"
                onClick={handleApply}
              >
                {text.applyFilters}
              </CmsActionButton>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
