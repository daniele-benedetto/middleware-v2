import Image from "next/image";

import { CmsDisplay } from "@/components/cms/primitives/typography";
import { cn } from "@/lib/utils";

import type { ElementType } from "react";

export type CmsBrandSize = "sm" | "md" | "lg" | "xl";

const logoPixelSize: Record<CmsBrandSize, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 96,
};

const wordmarkDisplaySize: Record<CmsBrandSize, "h3" | "h2" | "h1" | "hero"> = {
  sm: "h3",
  md: "h2",
  lg: "h1",
  xl: "hero",
};

const brandGap: Record<CmsBrandSize, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-5",
  xl: "gap-6",
};

type CmsLogoProps = {
  size?: CmsBrandSize;
  className?: string;
  priority?: boolean;
};

export function CmsLogo({ size = "sm", className, priority }: CmsLogoProps) {
  const dim = logoPixelSize[size];
  return (
    <Image
      src="/brand/middleware-logo.svg"
      alt="Middleware logo"
      width={dim}
      height={dim}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

type CmsWordmarkProps = {
  size?: CmsBrandSize;
  className?: string;
  as?: ElementType;
};

export function CmsWordmark({ size = "sm", className, as }: CmsWordmarkProps) {
  return (
    <CmsDisplay
      as={as ?? "span"}
      size={wordmarkDisplaySize[size]}
      className={cn("text-foreground", className)}
    >
      Middleware
    </CmsDisplay>
  );
}

type CmsBrandProps = {
  size?: CmsBrandSize;
  orientation?: "horizontal" | "vertical";
  className?: string;
  priority?: boolean;
  wordmarkAs?: ElementType;
};

export function CmsBrand({
  size = "sm",
  orientation = "horizontal",
  className,
  priority,
  wordmarkAs,
}: CmsBrandProps) {
  return (
    <div
      className={cn(
        "flex items-center",
        orientation === "vertical" && "flex-col",
        brandGap[size],
        className,
      )}
    >
      <CmsLogo size={size} priority={priority} />
      <CmsWordmark size={size} as={wordmarkAs} />
    </div>
  );
}
