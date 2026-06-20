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
import { getCanonicalUrl, seoConfig } from "@/lib/seo";

import type { PublicCurrentIssueDetail } from "@/lib/public/server/current-issue-detail";
import type { PublicIssueListItem } from "@/lib/public/server/issues";

type PublicHomePageProps = {
  currentIssue: PublicCurrentIssueDetail | null;
  publishedIssues: PublicIssueListItem[];
};

function buildHomeJsonLd(currentIssue: PublicCurrentIssueDetail | null) {
  const siteUrl = getCanonicalUrl("/");
  const website = {
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    name: seoConfig.siteName,
    url: siteUrl,
    inLanguage: "it-IT",
  };

  if (!currentIssue) {
    return { "@context": "https://schema.org", "@graph": [website] };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      website,
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}#current-issue`,
        name: currentIssue.title,
        description: getIssuePlainDescription(currentIssue),
        url: siteUrl,
        isPartOf: { "@id": `${siteUrl}#website` },
        datePublished: currentIssue.publishedAt,
        hasPart: currentIssue.articles.map((article) => ({
          "@type": "Article",
          headline: article.title,
          description: article.excerpt ?? undefined,
          author: article.authorName
            ? { "@type": "Organization", name: article.authorName }
            : undefined,
          datePublished: article.publishedAt,
          position: article.position,
        })),
      },
    ],
  };
}

export function PublicHomePage({ currentIssue, publishedIssues }: PublicHomePageProps) {
  const text = i18n.public.home;
  const archiveIssues = getArchiveIssues(publishedIssues, currentIssue);

  return (
    <main id="top" className="flex flex-1 flex-col bg-background font-heading text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildHomeJsonLd(currentIssue)) }}
      />
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
