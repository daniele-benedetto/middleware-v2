import { PublicFooter, PublicHeader } from "@/components/public";
import { ArchiveSection } from "@/components/public/home/archive-section";
import { CurrentIssueHero } from "@/components/public/home/current-issue-hero";
import { EditorialLead } from "@/components/public/home/editorial-lead";
import { HomeScrollProgress } from "@/components/public/home/home-scroll-progress";
import {
  buildHomeIssueSections,
  getArchiveIssues,
  getIssueOrderLabel,
  getIssuePlainDescription,
} from "@/components/public/home/home-view-model";
import { IssueSection } from "@/components/public/home/issue-section";
import { i18n } from "@/lib/i18n";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

type PublicHomePageProps = {
  currentIssue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
};

export function PublicHomePage({ currentIssue, publishedIssues }: PublicHomePageProps) {
  const text = i18n.public.home;
  const sections = buildHomeIssueSections(currentIssue);
  const archiveIssues = getArchiveIssues(publishedIssues, currentIssue);

  return (
    <main id="top" className="flex flex-1 flex-col bg-background font-heading text-foreground">
      <HomeScrollProgress />
      <PublicHeader />
      {currentIssue ? (
        <>
          <CurrentIssueHero
            issue={currentIssue}
            description={getIssuePlainDescription(currentIssue)}
            issueLabel={getIssueOrderLabel(publishedIssues, currentIssue, text.hero.issueLabel)}
          />
          <EditorialLead articles={sections.editorial} />
          {sections.sections.map((section, index) => (
            <IssueSection
              key={section.id}
              id={section.id}
              title={section.title}
              range={section.title}
              marker={index === 0 ? "outline" : "solid"}
              articles={section.articles}
              variant={index === 0 ? "compact" : "prominent"}
              headerTopBorder={index !== 0 || sections.editorial.length === 0}
            />
          ))}
        </>
      ) : (
        <section className="px-4 py-16 sm:px-6 lg:px-12">
          <p className="mb-4 font-heading text-xs font-extrabold tracking-[0.12em] text-accent uppercase">
            {text.empty.kicker}
          </p>
          <h1 className="max-w-[16ch] font-heading text-[clamp(44px,8vw,96px)] leading-[0.92] font-black tracking-[-0.038em]">
            {text.empty.title}
          </h1>
          <p className="mt-6 max-w-[48ch] font-editorial text-[19px] leading-normal text-body-text">
            {text.empty.description}
          </p>
        </section>
      )}
      <ArchiveSection
        title={text.archive.title}
        description={text.archive.description}
        issues={archiveIssues}
        countLabel={text.archive.countLabel}
        cta={text.archive.cta}
      />
      <PublicFooter />
    </main>
  );
}
