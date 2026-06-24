import { PublicSystemScreen } from "@/components/public";
import { getArchiveIssueViewModels } from "@/components/public/sections/archive/archive-view-model";
import { IssuesArchiveGrid } from "@/components/public/sections/archive/issues-archive-grid";
import { IssuesArchiveHero } from "@/components/public/sections/archive/issues-archive-hero";
import { i18n } from "@/lib/i18n";
import { buildIssuesArchiveJsonLd } from "@/lib/seo";

import type { PublicIssueListItem } from "@/lib/public/types/issues";

type PublicIssuesArchivePageProps = {
  issues: PublicIssueListItem[];
};

export function PublicIssuesArchivePage({ issues }: PublicIssuesArchivePageProps) {
  const text = i18n.public.issuesArchive;
  const issueViewModels = getArchiveIssueViewModels(issues);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildIssuesArchiveJsonLd(issues)),
        }}
      />
      {issueViewModels.length > 0 ? (
        <>
          <IssuesArchiveHero
            title={text.hero.title}
            description={text.hero.description}
            totalLabel={text.hero.totalLabel(issueViewModels.length)}
          />
          <IssuesArchiveGrid issues={issueViewModels} countLabel={text.countLabel} />
        </>
      ) : (
        <PublicSystemScreen
          code={text.empty.code}
          kicker={text.empty.kicker}
          title={text.empty.title}
          description={text.empty.description}
        />
      )}
    </main>
  );
}
