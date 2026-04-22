import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cmsSectionDividerVariants = cva("w-full border-0 border-t", {
  variants: {
    tone: {
      default: "border-foreground",
      strong: "border-t-[3px] border-foreground",
      accent: "border-t-[4px] border-accent",
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
