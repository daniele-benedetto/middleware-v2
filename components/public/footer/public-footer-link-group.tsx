import Link from "next/link";

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
      <h4 className="mb-3.5 font-heading text-xs font-bold tracking-[0.1em] text-accent uppercase">
        {title}
      </h4>
      <div className="flex flex-col gap-2.25 text-sm text-cream-on-dark">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="transition-colors duration-(--motion-fast) hover:text-background hover:underline hover:underline-offset-3"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
