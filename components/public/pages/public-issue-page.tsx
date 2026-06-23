import { PublicFooter, PublicHeader, PublicSystemScreen } from "@/components/public";
import { ArchiveSection } from "@/components/public/home/archive-section";
import { CurrentIssueHero } from "@/components/public/home/current-issue-hero";
import { HomeScrollProgress } from "@/components/public/home/home-scroll-progress";
import {
  getArchiveIssues,
  getIssueOrderLabel,
  getIssuePlainDescription,
} from "@/components/public/home/home-view-model";
import { DossierHome } from "@/components/public/sections/dossier/dossier-home";
import { i18n } from "@/lib/i18n";
import { formatIssueNumber } from "@/lib/public/format/issue";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";

type PublicIssuePageProps = {
  issue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
};

export function PublicIssuePage({ issue, publishedIssues }: PublicIssuePageProps) {
  const text = i18n.public.issuePage;
  const archiveText = i18n.public.home.archive;
  const archiveIssues = getArchiveIssues(publishedIssues, issue).slice(0, 3);

  return (
    <main className="flex flex-1 flex-col bg-background font-heading text-foreground">
      <HomeScrollProgress />
      <PublicHeader />
      <div tabIndex={-1} className="flex flex-col focus:outline-none">
        {issue ? (
          <>
            <CurrentIssueHero
              issue={issue}
              description={getIssuePlainDescription(issue)}
              issueNumber={getIssueOrderLabel(publishedIssues, issue, formatIssueNumber)}
            />
            <DossierHome issue={issue} />
            <ArchiveSection
              title={archiveText.title}
              description={archiveText.description}
              archiveHref="/uscite"
              archiveLabel={archiveText.archiveLabel}
              issues={archiveIssues}
              allIssues={publishedIssues}
              countLabel={archiveText.countLabel}
            />
          </>
        ) : (
          <PublicSystemScreen
            code={text.empty.code}
            kicker={text.empty.kicker}
            title={text.empty.title}
            description={text.empty.description}
          />
        )}
      </div>
      <PublicFooter />
    </main>
  );
}
