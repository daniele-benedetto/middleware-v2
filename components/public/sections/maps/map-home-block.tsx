import { courseVariantClasses } from "@/components/public/course-variant";
import { publicTypography } from "@/components/public/primitives";
import { MapHomeCanvas } from "@/components/public/sections/maps/map-home-canvas";
import { StyledTitle } from "@/components/public/styled-title";
import { extractPlainText } from "@/lib/rich-text/plain-text";

import type { MapHomeBlock as MapHomeBlockData } from "@/components/public/home/home-view-model";

export function MapHomeBlock({ block }: { block: MapHomeBlockData }) {
  const description = extractPlainText(block.map.descriptionRich);
  const variant = courseVariantClasses[block.map.homeVariant];

  return (
    <section className="scroll-mt-[var(--public-issue-anchor-offset)] py-10 md:py-12">
      <div className="w-full md:mx-auto md:max-w-384 md:px-12">
        <div
          className={`grid overflow-hidden ${variant.surface} md:border md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${variant.border}`}
        >
          <div className="min-w-0 p-5 pb-0 sm:p-6 md:p-8 lg:p-9">
            <h2 className={`${publicTypography.featureArticleTitle} max-w-[14ch] ${variant.title}`}>
              <StyledTitle
                title={block.map.title}
                titleStyled={block.map.titleStyled}
                primaryClassName={variant.titlePrimary}
              />
            </h2>
            {description ? (
              <p className={`${publicTypography.dossierDescription} mt-5 ${variant.description}`}>
                {description}
              </p>
            ) : null}
          </div>
          <div
            className={`relative z-0 mt-6 h-[calc(100dvh-var(--public-header-height)-var(--public-header-height))] min-w-0 overflow-hidden bg-muted md:mt-0 md:h-auto md:min-h-full md:border-l ${variant.border}`}
          >
            <MapHomeCanvas map={block.map} />
          </div>
        </div>
      </div>
    </section>
  );
}
