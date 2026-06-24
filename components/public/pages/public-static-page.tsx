import { PublicMetaRail, PublicPageHero } from "@/components/public/compounds";
import { publicContentClassName } from "@/components/public/primitives";
import { PublicRichText } from "@/components/public/rich-text";
import { i18n } from "@/lib/i18n";
import { getPublicStaticPagePath, isPublicStaticPageSlug } from "@/lib/public/pages/static-pages";
import { buildStaticPageJsonLd } from "@/lib/seo";

import type { PublicPageDto } from "@/lib/server/modules/pages/dto/public";

type PublicStaticPageProps = {
  page: PublicPageDto;
};

function formatPageDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long" }).format(new Date(value));
}

function StaticPageMetaRail({ page }: PublicStaticPageProps) {
  const text = i18n.public.staticPage;

  return (
    <PublicMetaRail
      items={[{ key: "updated", label: `${text.updatedPrefix} ${formatPageDate(page.updatedAt)}` }]}
    />
  );
}

export function PublicStaticPage({ page }: PublicStaticPageProps) {
  const canonicalPath = isPublicStaticPageSlug(page.slug)
    ? getPublicStaticPagePath(page.slug)
    : "/";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 flex-col bg-background font-heading text-foreground focus:outline-none"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStaticPageJsonLd(page.title, canonicalPath)),
        }}
      />
      <article>
        <PublicPageHero
          as="header"
          title={page.title}
          titleStyled={page.titleStyled}
          backgroundCode="MW"
          description={page.excerpt}
          meta={<StaticPageMetaRail page={page} />}
          containerClassName="pt-7 sm:pt-9 lg:pt-14"
        />
        <div className="bg-surface py-12 sm:py-16 lg:py-20">
          <div className={publicContentClassName}>
            <PublicRichText value={page.contentRich} className="mx-auto max-w-3xl" />
          </div>
        </div>
      </article>
    </main>
  );
}
