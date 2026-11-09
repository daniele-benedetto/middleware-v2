import { Fragment } from "react";

import { PublicMetaRail, type PublicMetaRailItem } from "@/components/public/compounds";
import { PublicLink as Link } from "@/components/public/public-link";
import { StyledTitle } from "@/components/public/styled-title";

import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";

type ListenInfoProps = {
  /** Where the content belongs (issue and category, or course). */
  kicker: PublicMetaRailItem[];
  title: string;
  titleStyled: IssueTitleStyled | null;
  meta: PublicMetaRailItem[];
  backLink: { href: string; label: string };
};

/** Title block of the listen page, as the track info of a player. */
export function ListenInfo({ kicker, title, titleStyled, meta, backLink }: ListenInfoProps) {
  return (
    <header className="grid gap-1.5 lg:gap-3">
      <p className="truncate font-heading text-[10px] font-bold tracking-[0.1em] text-accent uppercase lg:text-[11px] lg:leading-snug lg:whitespace-normal">
        {kicker.map((item, index) => (
          <Fragment key={item.key}>
            {index > 0 ? (
              <span className="text-foreground/40" aria-hidden>
                {" · "}
              </span>
            ) : null}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
          </Fragment>
        ))}
      </p>
      <h1 className="line-clamp-2 font-heading text-[clamp(17px,4.6vw,22px)] leading-[1.02] font-black tracking-[-0.035em] text-balance text-foreground lg:line-clamp-4 lg:text-[clamp(24px,2.1vw,34px)] lg:tracking-[-0.045em]">
        <StyledTitle title={title} titleStyled={titleStyled} />
      </h1>
      <PublicMetaRail
        items={meta}
        className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-heading text-[11px] font-semibold text-muted lg:gap-2.5 lg:text-[13px]"
      />
      <Link
        href={backLink.href}
        className="inline-flex w-fit font-heading text-[10px] font-bold tracking-[0.08em] text-accent uppercase transition-colors duration-(--motion-fast) hover:text-foreground lg:mt-1 lg:text-[11px]"
      >
        {backLink.label}
      </Link>
    </header>
  );
}
