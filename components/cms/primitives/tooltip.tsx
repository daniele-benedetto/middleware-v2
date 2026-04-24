import { cva, type VariantProps } from "class-variance-authority";

import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsTooltipVariants = cva("rounded-none! px-2.5 py-1.5 max-w-55", {
  variants: {
    variant: {
      "short-dark":
        "bg-foreground text-(--bg-main) font-ui text-[10px] uppercase tracking-[0.04em]",
      "long-accent":
        "bg-accent text-white font-editorial italic text-[13px] leading-[1.4] py-2 px-3",
    },
  },
  defaultVariants: { variant: "short-dark" },
});

type CmsTooltipVariant = NonNullable<VariantProps<typeof cmsTooltipVariants>["variant"]>;

type CmsTooltipProps = {
  label: ReactNode;
  children: ReactNode;
  variant?: CmsTooltipVariant;
  side?: "top" | "bottom" | "left" | "right";
};

export function CmsTooltip({ label, children, variant, side = "top" }: CmsTooltipProps) {
  return (
    <ShadcnTooltipProvider>
      <ShadcnTooltip>
        <ShadcnTooltipTrigger
          render={
            <span className="cursor-help border-b border-dashed border-accent font-ui text-[11px] uppercase tracking-[0.06em] text-accent" />
          }
        >
          {children}
        </ShadcnTooltipTrigger>
        <ShadcnTooltipContent
          side={side}
          className={cn(cmsTooltipVariants({ variant }), "[&>[data-slot=tooltip-arrow]]:hidden")}
        >
          {label}
        </ShadcnTooltipContent>
      </ShadcnTooltip>
    </ShadcnTooltipProvider>
  );
}
