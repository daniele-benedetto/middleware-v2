import { publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { TrackedExternalLink } from "@/components/public/tracked-external-link";
import { cn } from "@/lib/utils";

type PublicFooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

type PublicFooterLinkGroupProps = {
  title: string;
  links: readonly PublicFooterLink[];
};

export function PublicFooterLinkGroup({ title, links }: PublicFooterLinkGroupProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <nav aria-label={title}>
      <h2 className={cn("mb-3.5 text-cream-on-dark", publicTypography.kicker, "font-bold")}>
        {title}
      </h2>
      <div className="flex flex-col gap-2.25 text-sm text-cream-on-dark">
        {links.map((link) =>
          link.external ? (
            <TrackedExternalLink
              key={link.label}
              href={link.href}
              source="footer"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-(--motion-fast) md:hover:text-background md:hover:underline md:hover:underline-offset-3"
            >
              {link.label}
            </TrackedExternalLink>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors duration-(--motion-fast) md:hover:text-background md:hover:underline md:hover:underline-offset-3"
            >
              {link.label}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
