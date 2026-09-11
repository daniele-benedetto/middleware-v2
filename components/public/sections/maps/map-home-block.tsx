import { publicTypography } from "@/components/public/primitives";
import { MapHomeCanvas } from "@/components/public/sections/maps/map-home-canvas";
import { StyledTitle } from "@/components/public/styled-title";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { MapHomeBlock as MapHomeBlockData } from "@/components/public/home/home-view-model";

export function MapHomeBlock({ block }: { block: MapHomeBlockData }) {
  const description = extractPlainText(block.map.descriptionRich);

  return (
    <section className="scroll-mt-20 py-10 md:py-12">
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div className="grid overflow-hidden md:border md:border-foreground md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 px-4 sm:px-6 md:p-8">
            <h2 className={`${publicTypography.featureArticleTitle} max-w-[14ch]`}>
              <StyledTitle title={block.map.title} titleStyled={block.map.titleStyled} />
            </h2>
            {description ? (
              <p className={`${publicTypography.dossierDescription} mt-5 text-body-text`}>
                {description}
              </p>
            ) : null}
            <details className="mt-8 border-t border-foreground pt-4">
              <summary className="cursor-pointer font-heading text-xs font-bold tracking-[0.08em] text-accent uppercase marker:text-foreground">
                Elenco dei punti
              </summary>
              <ol className="mt-4 space-y-4">
                {block.map.items.map((item) => {
                  const itemDescription = extractPlainText(item.descriptionRich);

                  return (
                    <li key={item.id} className="border-l-2 border-accent pl-3">
                      <h3 className="font-heading text-lg font-black leading-tight tracking-[-0.02em]">
                        {item.title}
                      </h3>
                      {itemDescription ? (
                        <p className="mt-1 font-editorial text-[15px] leading-normal text-body-text">
                          {itemDescription}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </details>
          </div>
          <div className="relative z-0 mt-6 h-[calc(100dvh-var(--public-header-height)-var(--public-header-height))] min-w-0 overflow-hidden bg-muted md:mt-0 md:h-auto md:min-h-full md:border-l md:border-foreground">
            <MapHomeCanvas map={block.map} />
          </div>
        </div>
      </div>
    </section>
  );
}
