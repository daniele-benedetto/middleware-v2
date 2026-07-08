import { PublicLink as Link } from "@/components/public/public-link";

export type PublicMetaRailItem = {
  key: string;
  label: string;
  href?: string;
  dateTime?: string;
};

type PublicMetaRailProps = {
  items: PublicMetaRailItem[];
  className?: string;
  separatorClassName?: string;
  linkClassName?: string;
};

export function PublicMetaRail({
  items,
  className = "flex flex-wrap items-center gap-3 font-heading text-[14px] font-semibold text-muted sm:text-[15px]",
  separatorClassName = "bg-accent",
  linkClassName = "hover:text-accent",
}: PublicMetaRailProps) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <span key={item.key} className="flex items-center gap-3">
          {index > 0 ? (
            <span className={`size-1 rounded-[1px] ${separatorClassName}`} aria-hidden />
          ) : null}
          {item.dateTime ? (
            <time dateTime={item.dateTime}>{item.label}</time>
          ) : item.href ? (
            <Link href={item.href} className={linkClassName}>
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </div>
  );
}
