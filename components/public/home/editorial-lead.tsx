import Image from "next/image";

import { StyledTitle } from "@/components/public/styled-title";
import { i18n } from "@/lib/i18n";

import type { HomeIssueArticle } from "@/components/public/home/home-view-model";

type EditorialLeadProps = {
  articles: HomeIssueArticle[];
};

export function EditorialLead({ articles }: EditorialLeadProps) {
  const article = articles[0];
  const text = i18n.public.home.editorial;

  if (!article) {
    return null;
  }

  return (
    <section id="editoriale" className="scroll-mt-20 bg-foreground text-background">
      <div className="w-full px-4 py-13 sm:px-6 lg:px-12 lg:pb-14">
        <div className="mb-6.5 flex flex-wrap items-center gap-3.5 border-b border-dark-border pb-5.5">
          <span className="inline-flex size-10.5 items-center justify-center rounded-[8px] bg-accent font-heading text-[17px] font-black text-background">
            {String(article.position).padStart(2, "0")}
          </span>
          <span className="font-heading text-[13px] font-extrabold tracking-[0.14em] text-accent uppercase">
            {text.kicker}
          </span>
          {article.authorName ? (
            <span className="ml-auto font-editorial text-[15px] text-dark-muted italic max-md:ml-0">
              {article.authorName}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-12">
          <div className="min-w-75 flex-1 basis-[460px]">
            <h2 className="font-heading text-[clamp(30px,3.6vw,54px)] leading-none font-extrabold tracking-[-0.025em]">
              <StyledTitle title={article.title} titleStyled={article.titleStyled} />
            </h2>
            {article.excerpt ? (
              <p className="mt-6 w-full font-editorial text-[clamp(19px,1.7vw,24px)] leading-[1.34] text-[#e7ddcb] italic">
                {article.excerpt}
              </p>
            ) : null}
            <a
              href="#editoriale"
              className="mt-7.5 inline-flex items-center gap-2.5 rounded-[8px] bg-accent px-5.5 py-3.25 font-heading text-[14.5px] font-bold text-background transition-colors duration-(--motion-fast) hover:bg-background hover:text-foreground"
            >
              {text.cta}
              <span aria-hidden>{text.ctaArrow}</span>
            </a>
          </div>

          {article.imageUrl ? (
            <div className="relative min-h-105 min-w-70 flex-1 basis-[360px] self-stretch overflow-hidden border border-dark-border grayscale">
              <Image
                src={article.imageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
