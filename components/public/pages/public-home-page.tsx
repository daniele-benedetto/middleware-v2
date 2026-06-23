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
import { buildHomeJsonLd } from "@/lib/seo/home-json-ld";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";

type PublicHomePageProps = {
  currentIssue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
  canonicalPath?: string;
};

export function PublicHomePage({
  currentIssue,
  publishedIssues,
  canonicalPath = "/",
}: PublicHomePageProps) {
  const text = i18n.public.home;
  const archiveIssues = getArchiveIssues(publishedIssues, currentIssue);

  return (
    <main className="flex flex-1 flex-col bg-background font-heading text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildHomeJsonLd(currentIssue, canonicalPath)),
        }}
      />
      <HomeScrollProgress />
      <PublicHeader />
      <div tabIndex={-1} className="flex flex-col focus:outline-none">
        {currentIssue ? (
          <>
            <CurrentIssueHero
              issue={currentIssue}
              description={getIssuePlainDescription(currentIssue)}
              issueNumber={getIssueOrderLabel(publishedIssues, currentIssue, formatIssueNumber)}
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
      </div>
      <PublicFooter />
    </main>
  );
}
