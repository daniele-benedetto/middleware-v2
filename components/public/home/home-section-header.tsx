import { publicTypography } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type HomeSectionHeaderProps = {
  title: string;
  description?: string;
  range?: string;
  action?: {
    label: string;
    href: string;
  };
  marker?: "outline" | "solid" | "none";
  headingLevel?: 2 | 3 | 4;
};

function SectionTitle({
  headingLevel,
  children,
}: {
  headingLevel: 2 | 3 | 4;
  children: ReactNode;
}) {
  const className = cn(
    "inline-flex items-center gap-2 text-balance",
    "font-heading text-[clamp(34px,4.8vw,72px)] leading-[0.9] font-black tracking-[-0.048em]",
  );

  if (headingLevel === 4) {
    return <h4 className={className}>{children}</h4>;
  }

  if (headingLevel === 3) {
    return <h3 className={className}>{children}</h3>;
  }

  return <h2 className={className}>{children}</h2>;
}

export function HomeSectionHeader({
  title,
  description,
  range,
  action,
  marker = "none",
  headingLevel = 2,
}: HomeSectionHeaderProps) {
  return (
    <div className="mb-7 md:mb-8 lg:mb-10">
      <div className="flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
        <div className="max-w-190">
          <SectionTitle headingLevel={headingLevel}>
            {marker === "outline" ? (
              <span className="size-3.5 rounded-[3px] border-2 border-accent bg-card" aria-hidden />
            ) : null}
            {marker === "solid" ? (
              <span className="size-3.5 rounded-[3px] bg-foreground" aria-hidden />
            ) : null}
            {title}
          </SectionTitle>
        </div>
        {range ? (
          <span className="font-heading text-xs font-bold tracking-[0.06em] text-muted">
            {range}
          </span>
        ) : null}
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 pb-1 text-right font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) md:hover:text-foreground"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
      <div className="mt-8 w-full border-t-2 border-foreground pt-5">
        {description ? (
          <p className={cn("max-w-[62ch] text-muted italic", publicTypography.editorialBody)}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
