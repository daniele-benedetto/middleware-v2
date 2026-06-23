import { publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { cn } from "@/lib/utils";

type HomeSectionHeaderProps = {
  title: string;
  description?: string;
  range?: string;
  action?: {
    label: string;
    href: string;
  };
  marker?: "outline" | "solid" | "none";
  topBorder?: boolean;
};

export function HomeSectionHeader({
  title,
  description,
  range,
  action,
  marker = "none",
  topBorder = true,
}: HomeSectionHeaderProps) {
  return (
    <div
      className={`flex items-center gap-4 border-b-2 border-foreground py-3.5 max-md:flex-wrap ${topBorder ? "border-t-2" : ""}`}
    >
      <span className={cn("inline-flex items-center gap-2", publicTypography.sectionTitle)}>
        {marker === "outline" ? (
          <span className="size-3.5 rounded-[3px] border-2 border-accent bg-card" aria-hidden />
        ) : null}
        {marker === "solid" ? (
          <span className="size-3.5 rounded-[3px] bg-foreground" aria-hidden />
        ) : null}
        {title}
      </span>
      {description ? (
        <span className={cn("text-muted italic", publicTypography.editorialSmall)}>
          {description}
        </span>
      ) : null}
      {range ? (
        <span className="ml-auto font-heading text-xs font-bold tracking-[0.06em] text-muted max-md:ml-0">
          {range}
        </span>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="ml-auto text-right font-heading text-xs font-bold tracking-[0.06em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
