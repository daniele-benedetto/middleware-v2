import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { getIssuePlainDescription } from "@/components/public/home/home-view-model";
import { publicContentClassName, publicInteraction } from "@/components/public/primitives";
import { PublicLink as Link } from "@/components/public/public-link";
import { StyledTitle } from "@/components/public/styled-title";
import {
  buildIssueNumberMap,
  formatIssueMonthYearLong,
  formatIssueNumber,
} from "@/lib/public/format/issue";
import { cn } from "@/lib/utils";

import type { PublicIssueListItem } from "@/lib/public/types/issues";
import type { IssueHomeVariant } from "@/lib/server/modules/issues/schema";

type ArchiveSectionProps = {
  title: string;
  description: string;
  archiveHref: string;
  archiveLabel: string;
  issues: PublicIssueListItem[];
  allIssues: PublicIssueListItem[];
  countLabel: (count: number) => string;
};

const archiveCardVariantClasses: Record<
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
    backgroundNumber: "text-accent/15 [-webkit-text-stroke:0.35px_rgba(0,0,0,0.22)]",
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
    backgroundNumber: "text-foreground/15 [-webkit-text-stroke:0.35px_rgba(255,248,235,0.24)]",
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
    backgroundNumber: "text-accent/20 [-webkit-text-stroke:0.35px_rgba(255,248,235,0.18)]",
    title: "text-background",
    titlePrimary: "text-accent",
    description: "text-cream-warm",
    meta: "text-dark-muted",
    separator: "bg-accent",
    border: "border-dark-border",
    cardBorder: "",
  },
};

function getArchiveGridClassName(count: number) {
  if (count === 1) {
    return "grid";
  }

  if (count === 2) {
    return "grid md:grid-cols-2";
  }

  if (count === 3) {
    return "grid md:grid-cols-2 xl:grid-cols-3";
  }

  return "grid md:grid-cols-2 xl:grid-cols-3";
}

function getArchiveCardClassName(index: number, count: number) {
  if (count === 3 && index === 2) {
    return "md:col-span-2 xl:col-span-1";
  }

  return undefined;
}

export function ArchiveSection({
  title,
  description,
  archiveHref,
  archiveLabel,
  issues,
  allIssues,
  countLabel,
}: ArchiveSectionProps) {
  if (issues.length === 0) {
    return null;
  }

  const issueNumbers = buildIssueNumberMap(allIssues);
  return (
    <section className="scroll-mt-20 py-12 lg:py-14">
      <div className={publicContentClassName}>
        <HomeSectionHeader
          title={title}
          description={description}
          action={{ label: archiveLabel, href: archiveHref }}
        />
        <div className={getArchiveGridClassName(issues.length)}>
          {issues.map((issue, index) => {
            const issueDescription = getIssuePlainDescription(issue);
            const issueNumber = issueNumbers.get(issue.id) ?? formatIssueNumber(0);
            const variantClasses = archiveCardVariantClasses[issue.homeVariant];
            const publishedAtLabel = formatIssueMonthYearLong(issue.publishedAt);

            return (
              <Link
                key={issue.id}
                href={`/uscite/${issue.slug}`}
                className={cn(
                  publicInteraction.cardBase,
                  "relative isolate flex min-h-96 flex-col overflow-hidden px-5 py-6 sm:px-6 sm:py-7 lg:min-h-112 lg:px-7 lg:py-8",
                  variantClasses.surface,
                  variantClasses.cardBorder,
                  getArchiveCardClassName(index, issues.length),
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute top-4 right-4 -z-10 font-heading text-[clamp(96px,13vw,180px)] leading-[0.75] font-black tracking-tighter select-none",
                    variantClasses.backgroundNumber,
                  )}
                  aria-hidden
                >
                  {issueNumber}
                </span>

                <h3
                  className={cn(
                    "font-heading text-[clamp(30px,3.8vw,52px)] leading-[0.9] font-black tracking-[-0.048em] text-balance",
                    variantClasses.title,
                  )}
                >
                  <StyledTitle
                    title={issue.title}
                    titleStyled={issue.titleStyled}
                    primaryClassName={variantClasses.titlePrimary}
                  />
                </h3>

                <div className={cn("mt-6 w-full border-t-2 pt-5", variantClasses.border)}>
                  {issueDescription ? (
                    <p
                      className={cn(
                        "font-editorial text-[16px] leading-normal italic lg:text-[17px]",
                        variantClasses.description,
                      )}
                    >
                      {issueDescription}
                    </p>
                  ) : null}

                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-3 font-heading text-xs font-semibold",
                      issueDescription ? "mt-6" : "",
                      variantClasses.meta,
                    )}
                  >
                    <span>{issueNumber}</span>
                    <span
                      className={cn("size-1 rounded-[1px]", variantClasses.separator)}
                      aria-hidden
                    />
                    <span>{publishedAtLabel}</span>
                    <span
                      className={cn("size-1 rounded-[1px]", variantClasses.separator)}
                      aria-hidden
                    />
                    <span>{countLabel(issue.articlesCount)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
