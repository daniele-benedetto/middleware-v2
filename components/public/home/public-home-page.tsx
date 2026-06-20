import { PublicFooter, PublicHeader, PublicSystemScreen } from "@/components/public";
import { ArchiveSection } from "@/components/public/home/archive-section";
import { CurrentIssueHero } from "@/components/public/home/current-issue-hero";
import { DossierHome } from "@/components/public/home/dossier-home";
import { HomeScrollProgress } from "@/components/public/home/home-scroll-progress";
import {
  getArchiveIssues,
  getIssueOrderLabel,
  getIssuePlainDescription,
} from "@/components/public/home/home-view-model";
import { i18n } from "@/lib/i18n";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

type PublicHomePageProps = {
  currentIssue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
};

export function PublicHomePage({ currentIssue, publishedIssues }: PublicHomePageProps) {
  const text = i18n.public.home;
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
          <DossierHome issue={currentIssue} />
        </>
      ) : (
        <PublicSystemScreen
          code={text.empty.code}
          kicker={text.empty.kicker}
          title={text.empty.title}
          description={text.empty.description}
        />
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
