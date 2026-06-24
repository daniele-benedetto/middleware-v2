import { getArchiveIssues } from "@/components/public/home/home-view-model";
import { PublicIssueDossierPage } from "@/components/public/pages/public-issue-dossier-page";
import { i18n } from "@/lib/i18n";
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
    <PublicIssueDossierPage
      issue={currentIssue}
      publishedIssues={publishedIssues}
      archiveIssues={archiveIssues}
      empty={text.empty}
      showArchiveWithoutIssue
      jsonLd={
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildHomeJsonLd(currentIssue, canonicalPath)),
          }}
        />
      }
    />
  );
}
