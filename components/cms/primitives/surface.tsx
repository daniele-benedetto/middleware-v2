import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsSurfaceVariants = cva("bg-background", {
  variants: {
    border: {
      default: "border border-foreground",
      strong: "border-[1px] border-foreground",
      none: "",
    },
    spacing: {
      none: "",
      sm: "p-3.5",
      md: "p-4",
      lg: "p-5",
      xl: "p-6",
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
  as?: "section" | "div" | "article" | "aside";
} & VariantProps<typeof cmsSurfaceVariants>;

export function CmsSurface({
  children,
  className,
  border,
  spacing,
  as: Tag = "section",
}: CmsSurfaceProps) {
  return <Tag className={cn(cmsSurfaceVariants({ border, spacing }), className)}>{children}</Tag>;
}
