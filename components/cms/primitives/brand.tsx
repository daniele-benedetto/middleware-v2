import Image from "next/image";
import Link from "next/link";

import { CmsDisplay } from "@/components/cms/primitives/typography";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { ElementType, MouseEventHandler } from "react";

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
  const text = i18n.cms.brand;
  const dim = logoPixelSize[size];
  return (
    <Image
      src="/brand/middleware-logo.svg"
      alt={text.logoAlt}
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
  const text = i18n.cms.brand;
  return (
    <CmsDisplay
      as={as ?? "span"}
      size={wordmarkDisplaySize[size]}
      className={cn("text-foreground", className)}
    >
      {text.wordmark}
    </CmsDisplay>
  );
}

type CmsBrandProps = {
  size?: CmsBrandSize;
  orientation?: "horizontal" | "vertical";
  className?: string;
  priority?: boolean;
  wordmarkAs?: ElementType;
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
};

export function CmsBrand({
  size = "sm",
  orientation = "horizontal",
  className,
  priority,
  wordmarkAs,
  to,
  onClick,
}: CmsBrandProps) {
  const brandClassName = cn(
    "flex items-center",
    orientation === "vertical" && "flex-col",
    brandGap[size],
    className,
  );

  const content = (
    <>
      <CmsLogo size={size} priority={priority} />
      <CmsWordmark size={size} as={wordmarkAs} />
    </>
  );

  if (to) {
    return (
      <Link
        href={to}
        onClick={onClick as MouseEventHandler<HTMLAnchorElement> | undefined}
        className={brandClassName}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick as MouseEventHandler<HTMLButtonElement>}
        className={cn(brandClassName, "text-left")}
      >
        {content}
      </button>
    );
  }

  return <div className={brandClassName}>{content}</div>;
}
