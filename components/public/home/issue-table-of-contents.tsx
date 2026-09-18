import { ChartBar, GraduationCap, Map, Newspaper } from "lucide-react";

import { IssueTableOfContentsMenu } from "@/components/public/home/issue-table-of-contents-menu";
import { publicContentClassName } from "@/components/public/primitives";
import { formatArticleNumber } from "@/components/public/sections/dossier/dossier-format";
import { i18n } from "@/lib/i18n";

import type { CSSProperties } from "react";

export type IssueTableOfContentsItem = {
  id: string;
  label: string;
  number?: number;
  icon?: "course" | "map" | "questionnaireAnalysis" | "preview";
};

export type IssueTableOfContentsIssue = {
  id: string;
  issueNumber: string;
  slug: string;
  title: string;
};

const blockIcons = {
  course: GraduationCap,
  map: Map,
  questionnaireAnalysis: ChartBar,
  preview: Newspaper,
} as const;

export function IssueTableOfContents({
  items,
  issueNumber,
  issueTitle,
  issues,
  showMenu = true,
}: {
  items: IssueTableOfContentsItem[];
  issueNumber: string;
  issueTitle: string;
  issues: IssueTableOfContentsIssue[];
  showMenu?: boolean;
}) {
  return (
    <>
      <section
        id="indice"
        className="hidden scroll-mt-[var(--public-issue-anchor-offset)] md:block"
      >
        <div className={publicContentClassName}>
          <nav aria-label={i18n.public.home.dossier.tableOfContentsLabel}>
            <ol className="grid md:grid-cols-2 md:gap-x-12 lg:grid-cols-3">
              {items.map((item, index) => {
                const Icon = item.icon ? blockIcons[item.icon] : null;

                return (
                  <li
                    key={item.id}
                    className="flex border-t border-foreground first:border-t-0 last:border-b-0 md:[&:nth-child(2)]:border-t-0 md:[&:nth-last-child(2)]:border-b-0 lg:[&:nth-child(3)]:border-t-0 lg:[&:nth-last-child(3)]:border-b-0"
                    data-page-reveal="body"
                    style={{ "--page-reveal-delay": `${600 + index * 70}ms` } as CSSProperties}
                  >
                    <a
                      href={`#${item.id}`}
                      className="group flex min-h-18 w-full flex-1 flex-wrap items-center gap-x-4 gap-y-1 py-3.5 transition-colors duration-(--motion-fast) focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-accent md:hover:bg-surface-hover"
                    >
                      {item.number ? (
                        <span className="shrink-0 font-heading text-[15px] leading-none font-black tracking-[-0.02em] text-accent tabular-nums">
                          {formatArticleNumber(item.number)}
                        </span>
                      ) : Icon ? (
                        <span
                          className="flex size-5 shrink-0 items-center justify-center text-accent"
                          aria-hidden="true"
                        >
                          <Icon size={18} strokeWidth={2.5} />
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-[1_1_12.5rem] font-heading text-(length:--text-lg) leading-[1.2] font-bold tracking-[-0.025em] text-foreground">
                        {item.label}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </section>
      {showMenu ? (
        <IssueTableOfContentsMenu
          items={items}
          issueNumber={issueNumber}
          issueTitle={issueTitle}
          issues={issues}
        />
      ) : null}
    </>
  );
}
