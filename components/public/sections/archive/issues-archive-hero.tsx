import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";

type IssuesArchiveHeroProps = {
  title: string;
  description: string;
  totalLabel: string;
};

export function IssuesArchiveHero({ title, description, totalLabel }: IssuesArchiveHeroProps) {
  return (
    <PublicPageHero
      title={title}
      description={description}
      meta={<PublicMetaRail items={[{ key: "total", label: totalLabel }]} />}
    />
  );
}
