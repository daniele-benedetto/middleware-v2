import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { PublicRichText } from "@/components/public/rich-text";
import { StyledTitle } from "@/components/public/styled-title";
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
  return (
    <div className="flex flex-wrap items-center gap-3 font-heading text-[13px] font-semibold text-muted sm:text-[14px]">
      <span>Ultimo aggiornamento: {formatPageDate(page.updatedAt)}</span>
    </div>
  );
}

export function PublicStaticPage({ page }: PublicStaticPageProps) {
  const canonicalPath = isPublicStaticPageSlug(page.slug)
    ? getPublicStaticPagePath(page.slug)
    : "/";

  return (
    <main id="top" className="flex flex-1 flex-col bg-background font-heading text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStaticPageJsonLd(page.title, canonicalPath)),
        }}
      />
      <article id="main-content" tabIndex={-1} className="focus:outline-none">
        <header className="relative isolate w-full overflow-hidden bg-background">
          <div className={`${publicContentClassName} relative pt-7 sm:pt-9 lg:pt-14`}>
            <div
              className={`${publicTypography.issueBackgroundNumber} pointer-events-none absolute top-5 right-5 z-0 text-accent/15 select-none [-webkit-text-stroke:0.45px_rgba(0,0,0,0.25)]`}
              aria-hidden
            >
              MW
            </div>

            <div className="relative z-10 w-full">
              <h1 className={`${publicTypography.homeHeroTitle} w-full text-foreground`}>
                <StyledTitle title={page.title} titleStyled={page.titleStyled} />
              </h1>
              {page.excerpt ? (
                <div className="mt-8 w-full border-t-2 border-foreground pt-5">
                  <p className="font-editorial text-[clamp(18px,1.8vw,25px)] leading-[1.36] text-body-text italic">
                    {page.excerpt}
                  </p>
                  <div className="mt-6">
                    <StaticPageMetaRail page={page} />
                  </div>
                </div>
              ) : (
                <div className="mt-7">
                  <StaticPageMetaRail page={page} />
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="bg-surface py-12 sm:py-16 lg:py-20">
          <div className={publicContentClassName}>
            <PublicRichText value={page.contentRich} className="mx-auto max-w-3xl" />
          </div>
        </div>
      </article>
    </main>
  );
}
