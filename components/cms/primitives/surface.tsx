import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsSurfaceVariants = cva("rounded-[8px]", {
  variants: {
    tone: {
      card: "bg-card text-foreground",
      cream: "bg-background text-foreground",
      muted: "bg-card-hover text-foreground",
      dark: "bg-foreground text-background",
    },
    border: {
      default: "border border-foreground",
      strong: "border-[1px] border-foreground",
      none: "",
    },
    radius: {
      none: "rounded-none",
      control: "rounded-[6px]",
      panel: "rounded-[8px]",
    },
    spacing: {
      none: "",
      sm: "p-3.5",
      md: "p-4",
      lg: "p-5",
      xl: "p-6",
    },
    interactive: {
      false: "",
      true: "transition-colors hover:bg-surface-hover data-[state=selected]:bg-surface-hover",
      rail: "transition-colors hover:bg-surface-hover data-[state=selected]:bg-surface-hover hover:shadow-[var(--interactive-rail-shadow)] data-[state=selected]:shadow-[var(--interactive-rail-shadow)]",
    },
  },
  defaultVariants: {
    tone: "card",
    border: "strong",
    radius: "panel",
    spacing: "lg",
    interactive: false,
  },
});

type CmsSurfaceProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
} & VariantProps<typeof cmsSurfaceVariants>;

export function CmsSurface({
  children,
  className,
  border,
  tone,
  radius,
  spacing,
  interactive,
  as: Tag = "section",
}: CmsSurfaceProps) {
  return (
    <Tag
      className={cn(cmsSurfaceVariants({ border, tone, radius, spacing, interactive }), className)}
    >
      {children}
    </Tag>
  );
}
