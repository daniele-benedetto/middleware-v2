import { getArchiveIssues } from "@/components/public/home/home-view-model";
import { PublicIssueDossierPage } from "@/components/public/pages/public-issue-dossier-page";
import { i18n } from "@/lib/i18n";
import { buildIssuePageJsonLd } from "@/lib/seo";

import type { PublicCurrentIssueDetail, PublicIssueListItem } from "@/lib/public/types/issues";

type PublicIssuePageProps = {
  issue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
};

export function PublicIssuePage({ issue, publishedIssues }: PublicIssuePageProps) {
  const text = i18n.public.issuePage;
  const archiveIssues = getArchiveIssues(publishedIssues, issue).slice(0, 3);

  return (
    <PublicIssueDossierPage
      issue={issue}
      publishedIssues={publishedIssues}
      archiveIssues={archiveIssues}
      empty={text.empty}
      jsonLd={
        issue ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(buildIssuePageJsonLd(issue)),
            }}
          />
        ) : null
      }
    />
  );
}
