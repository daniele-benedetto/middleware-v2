import Image from "next/image";
import Link from "next/link";

import { publicTypography } from "@/components/public/primitives";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PublicBrandProps = {
  href?: string;
  onClick?: () => void;
  tone?: "light" | "dark";
  priority?: boolean;
};

export function PublicBrand({
  href = "#top",
  onClick,
  tone = "light",
  priority,
}: PublicBrandProps) {
  const text = i18n.public.brand;

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3"
      aria-label={text.homeAriaLabel}
    >
      <Image
        src="/brand/middleware-logo.svg"
        alt={text.logoAlt}
        width={31}
        height={31}
        priority={priority}
        className="size-7.75 shrink-0 object-contain"
      />
      <span
        className={cn(
          publicTypography.brand,
          tone === "dark" ? "text-background" : "text-foreground",
        )}
      >
        {text.wordmark}
      </span>
    </Link>
  );
}
