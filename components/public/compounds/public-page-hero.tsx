import Image from "next/image";

import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";
import { cn } from "@/lib/utils";

import type { IssueTitleStyled } from "@/lib/server/modules/issues/schema";
import type { CSSProperties, ReactNode } from "react";

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
  titleTypographyClassName?: string;
  surfaceClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  backgroundCodeClassName?: string;
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
  titleTypographyClassName = publicTypography.homeHeroTitle,
  surfaceClassName = "bg-background",
  titleClassName = "text-foreground",
  descriptionClassName = "text-body-text",
  backgroundCodeClassName,
}: PublicPageHeroProps) {
  const hasBrandBackground = backgroundCode === "MW";

  const content = (
    <div className={`${publicContentClassName} relative ${containerClassName}`}>
      {backgroundCode ? (
        <div
          className={cn(
            "pointer-events-none absolute top-5 right-5 z-0 select-none",
            hasBrandBackground
              ? "size-[clamp(108px,26vw,390px)]"
              : `${publicTypography.issueBackgroundNumber} text-accent/15 [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]`,
            backgroundCodeClassName,
          )}
          data-page-reveal="code"
          style={{ "--page-reveal-delay": "60ms" } as CSSProperties}
          aria-hidden
        >
          {hasBrandBackground ? (
            <Image
              src="/brand/middleware-pictogram-red.png"
              alt=""
              width={390}
              height={390}
              className="size-full object-contain opacity-15"
            />
          ) : (
            backgroundCode
          )}
        </div>
      ) : null}

      <div className="relative z-10 w-full">
        {eyebrow ? (
          <div
            className="mb-5"
            data-page-reveal="eyebrow"
            style={{ "--page-reveal-delay": "110ms" } as CSSProperties}
          >
            {eyebrow}
          </div>
        ) : null}
        <h1
          className={cn(
            titleTypographyClassName,
            "w-full pb-[0.18em] leading-[0.94]",
            titleClassName,
          )}
          data-page-reveal="title"
          style={{ "--page-reveal-delay": "170ms" } as CSSProperties}
        >
          <StyledTitle
            title={title}
            titleStyled={titleStyled}
            primaryClassName={titlePrimaryClassName}
          />
        </h1>
        {description ? (
          <div
            className="mt-8 w-full pt-5 text-foreground"
            data-page-rule
            style={{ "--page-rule-delay": "300ms" } as CSSProperties}
          >
            <p
              className={cn(
                "font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] italic",
                descriptionClassName,
              )}
              data-page-reveal="description"
              style={{ "--page-reveal-delay": "380ms" } as CSSProperties}
            >
              {description}
            </p>
            {meta ? (
              <div
                className="mt-6"
                data-page-reveal="meta"
                style={{ "--page-reveal-delay": "460ms" } as CSSProperties}
              >
                {meta}
              </div>
            ) : null}
          </div>
        ) : meta ? (
          <div
            className="mt-7"
            data-page-reveal="meta"
            style={{ "--page-reveal-delay": "300ms" } as CSSProperties}
          >
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (as === "header") {
    return (
      <header className={cn("relative isolate w-full overflow-hidden", surfaceClassName)}>
        {content}
      </header>
    );
  }

  return (
    <section className={cn("relative isolate w-full overflow-hidden", surfaceClassName)}>
      {content}
    </section>
  );
}
