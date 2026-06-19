import { cva, type VariantProps } from "class-variance-authority";

import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsBadgeVariants = cva(
  "inline-flex h-auto w-fit shrink-0 items-center gap-1.5 rounded-[6px]! font-ui font-extrabold uppercase transition-none",
  {
    variants: {
      variant: {
        "category-outline-accent":
          "border border-accent bg-transparent text-accent px-2 py-0.75 text-[10px] tracking-[var(--tracking-meta)]",
        "category-outline-ink":
          "border border-foreground bg-transparent text-foreground px-2 py-0.75 text-[10px] tracking-[var(--tracking-meta)]",
        "category-solid-accent":
          "border-0 bg-accent text-background px-2 py-0.75 text-[10px] tracking-[var(--tracking-meta)]",
        "category-solid-ink":
          "border-0 bg-foreground text-background px-2 py-0.75 text-[10px] tracking-[var(--tracking-meta)]",
        "status-new":
          "border-0 bg-accent text-background px-1.5 py-0.5 text-[9px] tracking-[var(--tracking-meta)]",
        "status-draft":
          "border border-border bg-card-hover text-foreground px-1.5 py-0.5 text-[9px] tracking-[var(--tracking-meta)]",
        "status-published":
          "border-0 bg-foreground text-background px-1.5 py-0.5 text-[9px] tracking-[var(--tracking-meta)]",
        "status-archived":
          "border border-border bg-transparent text-muted-foreground px-1.5 py-0.5 text-[9px] tracking-[var(--tracking-meta)]",
      },
    },
    defaultVariants: { variant: "category-outline-accent" },
  },
);

type CmsBadgeVariant = NonNullable<VariantProps<typeof cmsBadgeVariants>["variant"]>;

type CmsBadgeProps = {
  children: ReactNode;
  variant?: CmsBadgeVariant;
  className?: string;
};

export function CmsBadge({ children, variant, className }: CmsBadgeProps) {
  return (
    <ShadcnBadge className={cn(cmsBadgeVariants({ variant }), className)}>{children}</ShadcnBadge>
  );
}

type CmsRemovableTagProps = {
  children: ReactNode;
  accent?: boolean;
  onRemove?: () => void;
  className?: string;
};

export function CmsRemovableTag({
  children,
  accent = false,
  onRemove,
  className,
}: CmsRemovableTagProps) {
  const text = i18n.cms.badge;
  const toneClass = accent
    ? "border-0 bg-accent text-background"
    : "border border-border bg-card-hover text-foreground";
  const closeOpacity = accent ? "opacity-70" : "opacity-50";

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-[6px] py-1 pr-2 pl-2.5",
        "font-ui text-[10px] font-bold uppercase tracking-[var(--tracking-meta)]",
        toneClass,
        className,
      )}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "cursor-pointer text-[12px] leading-none",
            closeOpacity,
            "hover:opacity-100",
          )}
          aria-label={text.remove}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

type CmsBreakingDotProps = {
  children: ReactNode;
  className?: string;
};

export function CmsBreakingDot({ children, className }: CmsBreakingDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-block size-2 rounded-full bg-accent" />
      <span className="font-ui text-[10px] font-extrabold uppercase tracking-[var(--tracking-label)] text-accent">
        {children}
      </span>
    </span>
  );
}
