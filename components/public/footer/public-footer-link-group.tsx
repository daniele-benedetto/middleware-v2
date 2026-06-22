import Link from "next/link";

import { publicTypography } from "@/components/public/primitives";
import { cn } from "@/lib/utils";

type PublicFooterLink = {
  label: string;
  href: string;
};

type PublicFooterLinkGroupProps = {
  title: string;
  links: readonly PublicFooterLink[];
};

export function PublicFooterLinkGroup({ title, links }: PublicFooterLinkGroupProps) {
  return (
    <div>
      <h4 className={cn("mb-3.5 text-accent", publicTypography.kicker, "font-bold")}>{title}</h4>
      <div className="flex flex-col gap-2.25 text-sm text-cream-on-dark">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="transition-colors duration-(--motion-fast) md:hover:text-background md:hover:underline md:hover:underline-offset-3"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
