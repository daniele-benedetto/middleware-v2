import {
  publicContentClassName,
  publicInteraction,
  publicTypography,
} from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { StyledTitle } from "@/components/public/styled-title";
import { formatIssueMonthYearLong } from "@/lib/public/format/issue";
import { cn } from "@/lib/utils";

import type { ArchiveIssueViewModel } from "@/components/public/sections/archive/archive-view-model";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";

type IssueArchiveCardProps = {
  issue: ArchiveIssueViewModel;
  countLabel: (count: number) => string;
  variant: IssueHomeVariant;
  className?: string;
};

const archiveCoverVariantClasses: Record<
  IssueHomeVariant,
  {
    surface: string;
    backgroundNumber: string;
    title: string;
    titlePrimary: string;
    description: string;
    meta: string;
    separator: string;
    border: string;
    cardBorder: string;
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
    cardBorder: "border border-foreground",
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
    cardBorder: "",
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
    cardBorder: "",
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
        "relative isolate block overflow-hidden py-7 max-lg:border-b max-lg:last:border-b-0 md:py-10 lg:flex lg:min-h-[calc(100vh-4rem)] lg:items-center lg:py-14",
        variantClasses.surface,
        variantClasses.border,
        variantClasses.cardBorder,
        "max-lg:border-x-0 max-lg:border-t-0",
        className,
      )}
    >
      <div className={cn(publicContentClassName, "relative z-10")}>
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

        <h3 className={cn(publicTypography.homeHeroTitle, "w-full", variantClasses.title)}>
          <StyledTitle
            title={issue.title}
            titleStyled={issue.titleStyled}
            primaryClassName={variantClasses.titlePrimary}
          />
        </h3>

        <div className={cn("mt-8 w-full lg:border-t-2 lg:pt-5", variantClasses.border)}>
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
