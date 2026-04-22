import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsSurfaceVariants = cva("bg-background", {
  variants: {
    border: {
      default: "border border-foreground",
      strong: "border-[3px] border-foreground",
      none: "",
    },
    spacing: {
      none: "",
      sm: "p-[14px]",
      md: "p-[16px]",
      lg: "p-[20px]",
      xl: "p-[24px]",
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
