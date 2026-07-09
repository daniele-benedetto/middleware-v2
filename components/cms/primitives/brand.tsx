import Image from "next/image";
import Link from "next/link";

import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { MouseEventHandler } from "react";

export type CmsBrandSize = "sm" | "md" | "lg" | "xl";

const logoHeight: Record<CmsBrandSize, string> = {
  sm: "h-8",
  md: "h-12",
  lg: "h-18",
  xl: "h-24",
};

const logoPixelHeight: Record<CmsBrandSize, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 96,
};

const logoPixelWidth: Record<CmsBrandSize, number> = {
  sm: 214,
  md: 321,
  lg: 481,
  xl: 642,
};

type CmsLogoProps = {
  size?: CmsBrandSize;
  className?: string;
  preload?: boolean;
};

export function CmsLogo({ size = "sm", className, preload }: CmsLogoProps) {
  const text = i18n.cms.brand;
  return (
    <Image
      src="/brand/middleware-logo-extended-black.png"
      alt={text.logoAlt}
      width={logoPixelWidth[size]}
      height={logoPixelHeight[size]}
      preload={preload}
      className={cn(logoHeight[size], "w-auto shrink-0 object-contain", className)}
    />
  );
}

type CmsBrandProps = {
  size?: CmsBrandSize;
  orientation?: "horizontal" | "vertical";
  className?: string;
  preload?: boolean;
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
};

export function CmsBrand({
  size = "sm",
  orientation = "horizontal",
  className,
  preload,
  to,
  onClick,
}: CmsBrandProps) {
  const brandClassName = cn(
    "flex items-center",
    orientation === "vertical" && "flex-col",
    className,
  );

  const content = <CmsLogo size={size} preload={preload} />;

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
