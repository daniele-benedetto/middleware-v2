import { cva, type VariantProps } from "class-variance-authority";

import {
  Tooltip as ShadcnTooltip,
  TooltipContent as ShadcnTooltipContent,
  TooltipProvider as ShadcnTooltipProvider,
  TooltipTrigger as ShadcnTooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

const cmsTooltipVariants = cva("rounded-none! px-2.5 py-1.5", {
  variants: {
    variant: {
      "short-dark":
        "bg-foreground text-(--bg-main) font-ui text-[10px] uppercase tracking-[0.04em] whitespace-nowrap",
      "long-accent":
        "bg-accent text-white font-editorial italic text-[13px] leading-[1.4] py-2 px-3 max-w-50 " +
        "[&_[data-slot=tooltip-arrow]]:bg-accent! [&_[data-slot=tooltip-arrow]]:fill-accent!",
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
          sideOffset={8}
          className={cn(cmsTooltipVariants({ variant }))}
        >
          {label}
        </ShadcnTooltipContent>
      </ShadcnTooltip>
    </ShadcnTooltipProvider>
  );
}
