import Image from "next/image";

import { PublicLink as Link } from "@/components/public/public-link";
import { i18n } from "@/lib/i18n";

import type { MouseEventHandler } from "react";

type PublicBrandProps = {
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  tone?: "light" | "dark";
  priority?: boolean;
};

const logoByTone: Record<NonNullable<PublicBrandProps["tone"]>, string> = {
  light: "/brand/middleware-logo-extended-black.png",
  dark: "/brand/middleware-logo-extended-white.png",
};

export function PublicBrand({ href = "/", onClick, tone = "light", priority }: PublicBrandProps) {
  const text = i18n.public.brand;

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3"
      aria-label={text.homeAriaLabel}
    >
      <Image
        src={logoByTone[tone]}
        alt={text.logoAlt}
        width={221}
        height={33}
        priority={priority}
        className="h-7.75 w-auto shrink-0 object-contain md:h-8.5"
      />
    </Link>
  );
}
