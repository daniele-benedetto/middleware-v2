import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsSurfaceVariants = cva("ui-surface border bg-background", {
  variants: {
    border: {
      default: "border-foreground",
      strong: "border-[3px] border-foreground",
    },
    spacing: {
      none: "",
      md: "p-4",
      lg: "p-6",
    },
  },
  defaultVariants: {
    border: "strong",
    spacing: "lg",
  },
});

type CmsSurfaceProps = {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof cmsSurfaceVariants>;

export function CmsSurface({ children, className, border, spacing }: CmsSurfaceProps) {
  return (
    <section className={cn(cmsSurfaceVariants({ border, spacing }), className)}>{children}</section>
  );
}
