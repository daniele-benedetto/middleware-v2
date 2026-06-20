import { HomeSectionHeader } from "@/components/public/home/home-section-header";
import { IssueArticleCard } from "@/components/public/home/issue-article-card";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type IssueSectionProps = {
  id: string;
  title: string;
  description?: string;
  range?: string;
  marker: "outline" | "solid";
  articles: HomeIssueArticle[];
  variant: "compact" | "prominent";
  headerTopBorder?: boolean;
};

export function IssueSection({
  id,
  title,
  description,
  range,
  marker,
  articles,
  variant,
  headerTopBorder,
}: IssueSectionProps) {
  if (articles.length === 0) {
    return null;
  }

  return (
    <section id={id} className="scroll-mt-20 px-4 pt-2 pb-10 sm:px-6 lg:px-12">
      <HomeSectionHeader
        title={title}
        description={description}
        range={range}
        marker={marker}
        topBorder={headerTopBorder}
      />
      <div className="grid border-l border-foreground [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))] md:[grid-template-columns:repeat(auto-fit,minmax(370px,1fr))]">
        {articles.map((article) => (
          <IssueArticleCard key={article.id} article={article} variant={variant} label={title} />
        ))}
      </div>
    </section>
  );
}
