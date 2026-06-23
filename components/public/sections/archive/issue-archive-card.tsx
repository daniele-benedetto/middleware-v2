import Link from "next/link";

import { publicInteraction, publicTypography } from "@/components/public/primitives";
import { StyledTitle } from "@/components/public/styled-title";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";
import { cn } from "@/lib/utils";

import type { ArchiveIssueViewModel } from "@/components/public/sections/archive/archive-view-model";

export type IssueArchiveCardVariant = "default" | "red" | "black";

type IssueArchiveCardProps = {
  issue: ArchiveIssueViewModel;
  countLabel: (count: number) => string;
  variant: IssueArchiveCardVariant;
  className?: string;
};

const archiveCoverVariantClasses: Record<
  IssueArchiveCardVariant,
  {
    surface: string;
    backgroundNumber: string;
    title: string;
    titlePrimary: string;
    description: string;
    meta: string;
    separator: string;
    border: string;
  }
> = {
  default: {
    surface: "bg-background text-foreground",
    backgroundNumber: "text-accent/15 [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]",
    title: "text-foreground",
    titlePrimary: "text-accent",
    description: "text-body-text",
    meta: "text-muted",
    separator: "bg-accent",
    border: "border-foreground",
  },
  red: {
    surface: "bg-accent text-background",
    backgroundNumber: "text-foreground/15 [-webkit-text-stroke:0.45px_rgba(255,248,235,0.24)]",
    title: "text-background",
    titlePrimary: "text-foreground",
    description: "text-cream-soft",
    meta: "text-cream-muted",
    separator: "bg-foreground",
    border: "border-foreground",
  },
  black: {
    surface: "bg-foreground text-background",
    backgroundNumber: "text-accent/20 [-webkit-text-stroke:0.45px_rgba(255,248,235,0.18)]",
    title: "text-background",
    titlePrimary: "text-accent",
    description: "text-cream-warm",
    meta: "text-dark-muted",
    separator: "bg-accent",
    border: "border-dark-border",
  },
};

export function IssueArchiveCard({ issue, countLabel, variant, className }: IssueArchiveCardProps) {
  const publishedAtLabel = formatIssueMonthYearLong(issue.publishedAt);
  const variantClasses = archiveCoverVariantClasses[variant];

  return (
    <Link
      href={`/uscite/${issue.slug}`}
      className={cn(
        publicInteraction.cardBase,
        "relative isolate block overflow-hidden px-5 py-7 sm:px-6 sm:py-9 md:px-8 md:py-10 lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center lg:px-12 lg:py-14 xl:px-16",
        variantClasses.surface,
        className,
      )}
    >
      <span
        className={cn(
          publicTypography.issueBackgroundNumber,
          "pointer-events-none absolute top-5 right-5 -z-10 select-none",
          variantClasses.backgroundNumber,
        )}
        aria-hidden
      >
        {issue.issueNumber}
      </span>

      <div className="relative z-10 w-full">
        <h3 className={cn(publicTypography.homeHeroTitle, "w-full", variantClasses.title)}>
          <StyledTitle
            title={issue.title}
            titleStyled={issue.titleStyled}
            primaryClassName={variantClasses.titlePrimary}
          />
        </h3>

        <div className={cn("mt-8 w-full border-t-2 pt-5", variantClasses.border)}>
          {issue.descriptionPlain ? (
            <p
              className={cn(
                "font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] italic",
                variantClasses.description,
              )}
            >
              {issue.descriptionPlain}
            </p>
          ) : null}

          <div
            className={cn(
              "mt-6 flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold sm:text-[14px]",
              variantClasses.meta,
            )}
          >
            <span>{issue.issueNumber}</span>
            <span className={cn("size-1 rounded-[1px]", variantClasses.separator)} aria-hidden />
            <span>{publishedAtLabel}</span>
            <span className={cn("size-1 rounded-[1px]", variantClasses.separator)} aria-hidden />
            <span>{countLabel(issue.articlesCount)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
