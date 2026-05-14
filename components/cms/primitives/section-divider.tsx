import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cmsSectionDividerVariants = cva("w-full border-0 border-t", {
  variants: {
    tone: {
      default: "border-foreground",
      strong: "border-t-[3px] border-foreground",
      grid: "border-foreground",
      accent: "border-t-[4px] border-accent",
      reading: "border-t-[3px] border-accent",
      dashed: "border-t border-dashed border-(--ink-30)",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

type CmsSectionDividerProps = {
  className?: string;
} & VariantProps<typeof cmsSectionDividerVariants>;

export function CmsSectionDivider({ className, tone }: CmsSectionDividerProps) {
  return <hr className={cn(cmsSectionDividerVariants({ tone }), className)} />;
}
