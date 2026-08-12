import { publicContentClassName, publicTypography } from "@/components/public/primitives";
import { MapHomeCanvas } from "@/components/public/sections/maps/map-home-canvas";
import { StyledTitle } from "@/components/public/styled-title";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { MapHomeBlock as MapHomeBlockData } from "@/components/public/home/home-view-model";

export function MapHomeBlock({ block }: { block: MapHomeBlockData }) {
  const description = extractPlainText(block.map.descriptionRich);

  return (
    <section className="scroll-mt-20 py-10 md:py-12">
      <div className={publicContentClassName}>
        <div className="grid overflow-hidden border border-foreground md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 p-6 md:p-8">
            <h2 className={`${publicTypography.featureArticleTitle} max-w-[14ch]`}>
              <StyledTitle title={block.map.title} titleStyled={block.map.titleStyled} />
            </h2>
            {description ? (
              <p className="mt-5 font-editorial text-[18px] leading-[1.42] text-body-text md:text-[21px]">
                {description}
              </p>
            ) : null}
          </div>
          <div className="relative min-h-80 min-w-0 overflow-hidden border-t border-foreground bg-muted md:min-h-full md:border-t-0 md:border-l">
            <MapHomeCanvas map={block.map} />
          </div>
        </div>
      </div>
    </section>
  );
}
