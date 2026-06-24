import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";

import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";
import type { ReactNode } from "react";

type PublicPageHeroProps = {
  title: string;
  titleStyled?: IssueTitleStyled | null;
  backgroundCode?: string;
  description?: string | null;
  meta?: ReactNode;
  eyebrow?: ReactNode;
  as?: "header" | "section";
  containerClassName?: string;
  titlePrimaryClassName?: string;
};

export function PublicPageHero({
  title,
  titleStyled,
  backgroundCode,
  description,
  meta,
  eyebrow,
  as = "section",
  containerClassName = "py-7 sm:py-9 lg:py-14",
  titlePrimaryClassName,
}: PublicPageHeroProps) {
  const content = (
    <div className={`${publicContentClassName} relative ${containerClassName}`}>
      {backgroundCode ? (
        <div
          className={`${publicTypography.issueBackgroundNumber} pointer-events-none absolute top-5 right-5 z-0 text-accent/15 select-none [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]`}
          aria-hidden
        >
          {backgroundCode}
        </div>
      ) : null}

      <div className="relative z-10 w-full">
        {eyebrow ? <div className="mb-5">{eyebrow}</div> : null}
        <h1 className={`${publicTypography.homeHeroTitle} w-full text-foreground`}>
          <StyledTitle
            title={title}
            titleStyled={titleStyled}
            primaryClassName={titlePrimaryClassName}
          />
        </h1>
        {description ? (
          <div className="mt-8 w-full border-t-2 border-foreground pt-5">
            <p className="font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] text-body-text italic">
              {description}
            </p>
            {meta ? <div className="mt-6">{meta}</div> : null}
          </div>
        ) : meta ? (
          <div className="mt-7">{meta}</div>
        ) : null}
      </div>
    </div>
  );

  if (as === "header") {
    return (
      <header className="relative isolate w-full overflow-hidden bg-background">{content}</header>
    );
  }

  return (
    <section className="relative isolate w-full overflow-hidden bg-background">{content}</section>
  );
}
