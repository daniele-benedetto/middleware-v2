import { PublicSystemScreen } from "@/components/public";
import { ArchiveSection } from "@/components/public/home/archive-section";
import { CurrentIssueHero } from "@/components/public/home/current-issue-hero";
import { HomeScrollProgress } from "@/components/public/home/home-scroll-progress";
import {
  getIssueOrderLabel,
  getIssuePlainDescription,
} from "@/components/public/home/home-view-model";
import { DossierHome } from "@/components/public/sections/dossier/dossier-home";
import { i18n } from "@/lib/i18n";
import { formatIssueNumber } from "@/lib/public/format/issue";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";
import type { ReactNode } from "react";

type PublicIssueDossierPageProps = {
  issue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
  archiveIssues: PublicIssueListItem[];
  empty: {
    code: string;
    kicker: string;
    title: string;
    description: string;
  };
  jsonLd?: ReactNode;
  showArchiveWithoutIssue?: boolean;
};

export function PublicIssueDossierPage({
  issue,
  publishedIssues,
  archiveIssues,
  empty,
  jsonLd,
  showArchiveWithoutIssue = false,
}: PublicIssueDossierPageProps) {
  const archiveText = i18n.public.home.archive;
  const shouldShowArchive = issue || showArchiveWithoutIssue;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      {jsonLd}
      <HomeScrollProgress />
      <div tabIndex={-1} className="flex flex-col focus:outline-none">
        {issue ? (
          <>
            <CurrentIssueHero
              issue={issue}
              description={getIssuePlainDescription(issue)}
              issueNumber={getIssueOrderLabel(publishedIssues, issue, formatIssueNumber)}
            />
            <DossierHome issue={issue} />
          </>
        ) : (
          <PublicSystemScreen
            code={empty.code}
            kicker={empty.kicker}
            title={empty.title}
            description={empty.description}
          />
        )}
        {shouldShowArchive ? (
          <ArchiveSection
            title={archiveText.title}
            description={archiveText.description}
            archiveHref="/uscite"
            archiveLabel={archiveText.archiveLabel}
            issues={archiveIssues}
            allIssues={publishedIssues}
            countLabel={archiveText.countLabel}
          />
        ) : null}
      </div>
    </main>
  );
}
